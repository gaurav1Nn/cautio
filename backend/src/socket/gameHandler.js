/**
 * Game Socket Handler
 * Handles game-related real-time events
 */
const { Room, Game } = require('../models');
const gameService = require('../services/gameService');
const { GAME_STATUS, GAME } = require('../utils/constants');

// Track reconnection grace periods
const disconnectTimers = new Map();

module.exports = (io, socket) => {
    const userId = socket.userId;

    /**
     * Start game (host only)
     */
    socket.on('game:start', async ({ roomId }) => {
        try {
            const room = await Room.findOne({ roomId });

            if (!room || !room.isHost(userId)) {
                return socket.emit('error', { message: 'Only host can start the game' });
            }

            const game = await gameService.startGame(roomId, io);

            await game.populate('wordMaster', 'username avatar');
            await game.populate('players.user', 'username avatar');
            await game.populate('currentTurn', 'username avatar');

            console.log('[game:start] Emitting events to room:', roomId);
            console.log('[game:start] Word Master:', game.wordMaster);

            // Debug: Check who's in the room
            const socketsInRoom = await io.in(roomId).fetchSockets();
            console.log('[game:start] Sockets in room:', socketsInRoom.length);
            socketsInRoom.forEach(s => {
                console.log('  - Socket:', s.id, 'User:', s.user?.username);
            });

            // Broadcast game start
            io.to(roomId).emit('game:start', {
                game: game.getPublicState(null),
                message: 'Game started!',
            });

            // Notify Word Master
            io.to(roomId).emit('game:word-selection', {
                wordMaster: game.wordMaster,
                message: `${game.wordMaster.username} is choosing a word...`,
            });

            console.info(`Game started in room ${roomId}`);
        } catch (error) {
            console.error('Game start error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Submit word (Word Master) - frontend emits game:word-set
     */
    socket.on('game:word-set', async ({ roomId, word, category, hint }) => {
        try {
            // Find the room first
            const room = await Room.findOne({ roomId });
            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            // Find active game for this room
            const game = await Game.findOne({
                room: room._id,
                status: { $in: [GAME_STATUS.WORD_SELECTION, GAME_STATUS.IN_PROGRESS] }
            });

            if (!game) {
                // No game exists yet - start one
                const newGame = await gameService.startGame(roomId, io);

                // Now submit the word
                const updatedGame = await gameService.submitWord(
                    newGame._id,
                    userId,
                    word,
                    category,
                    !word // useRandom if no word provided
                );

                // Store hint if provided
                if (hint && updatedGame) {
                    updatedGame.hint = hint;
                    await updatedGame.save();
                }

                await updatedGame.populate('wordMaster', 'username avatar');
                await updatedGame.populate('currentTurn', 'username avatar');

                // Broadcast word set (without revealing word)
                io.to(roomId).emit('game:word-set', {
                    wordLength: updatedGame.wordLength,
                    category: updatedGame.category,
                    currentTurn: updatedGame.currentTurn,
                    maskedWord: updatedGame.getMaskedWord(),
                    hint: hint || undefined,
                    message: 'Word has been set! Let the guessing begin!',
                });

                // Broadcast game start to update GameRoom
                io.to(roomId).emit('game:start', {
                    game: updatedGame.getPublicState(null),
                    wordMaster: updatedGame.wordMaster,
                    message: 'Game started!',
                });

                // Start turn timer
                gameService.startTurnTimer(updatedGame._id, io, roomId, updatedGame.turnTimeLimit);

            } else {
                // Game exists - just submit the word
                const updatedGame = await gameService.submitWord(
                    game._id,
                    userId,
                    word,
                    category,
                    !word
                );

                if (hint && updatedGame) {
                    updatedGame.hint = hint;
                    await updatedGame.save();
                }

                await updatedGame.populate('wordMaster', 'username avatar');
                await updatedGame.populate('currentTurn', 'username avatar');

                // Broadcast word set
                io.to(roomId).emit('game:word-set', {
                    wordLength: updatedGame.wordLength,
                    category: updatedGame.category,
                    currentTurn: updatedGame.currentTurn,
                    maskedWord: updatedGame.getMaskedWord(),
                    hint: hint || undefined,
                    message: 'Word has been set! Let the guessing begin!',
                });

                // Start turn timer
                gameService.startTurnTimer(game._id, io, roomId, updatedGame.turnTimeLimit);
            }

            console.info(`Word submitted in room ${roomId} by ${socket.user?.username}`);
        } catch (error) {
            console.error('Submit word error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Guess a letter
     */
    socket.on('game:guess', async ({ roomId, letter }) => {
        try {
            // Find room first to get current game
            const room = await Room.findOne({ roomId });
            if (!room || !room.currentGame) {
                return socket.emit('error', { message: 'No active game in this room' });
            }

            const gameId = room.currentGame;
            const { result, wordComplete, gameOver, game } = await gameService.guessLetter(
                gameId,
                userId,
                letter
            );

            // Broadcast letter result
            io.to(roomId).emit('game:letter-result', {
                letter: letter.toLowerCase(),
                correct: result.correct,
                positions: result.positions,
                guessedBy: socket.user.username,
            });

            // Broadcast updated word
            io.to(roomId).emit('game:word-update', {
                maskedWord: game.getMaskedWord(),
                incorrectGuesses: game.incorrectGuesses,
                guessedLetters: game.guessedLetters,
            });

            // Broadcast scores
            io.to(roomId).emit('game:scores', {
                players: game.players.map((p) => ({
                    user: p.user,
                    score: p.score,
                })),
            });

            if (wordComplete || gameOver) {
                gameService.clearTurnTimer(gameId);

                // Round ended
                await game.populate('roundWinner', 'username avatar');
                await game.populate('wordMaster', 'username avatar');

                io.to(roomId).emit('game:round-end', {
                    word: game.word,
                    wasWordGuessed: wordComplete,
                    roundWinner: game.roundWinner,
                    wordMaster: game.wordMaster,
                    players: game.players,
                    round: game.currentRound,
                    totalRounds: game.totalRounds,
                });

                // Auto-advance to next round after 5 seconds
                setTimeout(async () => {
                    if (game.currentRound < game.totalRounds) {
                        const nextGame = await gameService.nextRound(gameId);
                        if (nextGame) {
                            await nextGame.populate('wordMaster', 'username avatar');

                            io.to(roomId).emit('game:word-selection', {
                                wordMaster: nextGame.wordMaster,
                                round: nextGame.currentRound,
                                totalRounds: nextGame.totalRounds,
                            });
                        }
                    } else {
                        const finalGame = await gameService.endGame(gameId);
                        await finalGame.populate('winner', 'username avatar');
                        await finalGame.populate('players.user', 'username avatar');

                        io.to(roomId).emit('game:end', {
                            winner: finalGame.winner,
                            players: finalGame.players.sort((a, b) => b.score - a.score),
                            roundHistory: finalGame.roundHistory,
                        });
                    }
                }, 5000);
            } else {
                // Next turn
                const nextGame = await gameService.nextTurn(gameId);
                await nextGame.populate('currentTurn', 'username avatar');

                io.to(roomId).emit('game:turn-change', {
                    currentTurn: nextGame.currentTurn,
                });

                gameService.startTurnTimer(gameId, io, roomId, nextGame.turnTimeLimit);
            }
        } catch (error) {
            console.error('Guess error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Send hint (Word Master)
     */
    socket.on('game:send-hint', async ({ roomId, hint }) => {
        try {
            // Find room to get current game
            const room = await Room.findOne({ roomId });
            if (!room || !room.currentGame) {
                return socket.emit('error', { message: 'No active game in this room' });
            }

            const gameId = room.currentGame;
            const game = await gameService.sendHint(gameId, userId, hint);

            io.to(roomId).emit('game:hint', {
                hint,
                hintsRemaining: game.hintsRemaining,
                sentBy: socket.user.username,
            });
        } catch (error) {
            console.error('Send hint error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Reconnect to game
     */
    socket.on('game:reconnect', async ({ gameId }) => {
        try {
            // Clear disconnect timer
            const timerKey = `${gameId}-${userId}`;
            if (disconnectTimers.has(timerKey)) {
                clearTimeout(disconnectTimers.get(timerKey));
                disconnectTimers.delete(timerKey);
            }

            const game = await Game.findById(gameId);

            if (!game) {
                return socket.emit('error', { message: 'Game not found' });
            }

            const roomId = (await Room.findById(game.room))?.roomId;

            // Mark player as connected
            const player = game.getPlayer(userId);
            if (player) {
                player.isConnected = true;
                await game.save();
            }

            // Rejoin room
            socket.join(roomId);

            // Notify others
            io.to(roomId).emit('game:player-reconnected', {
                player: {
                    _id: socket.user._id,  // Frontend expects _id
                    username: socket.user.username,
                },
            });

            // Send current game state
            const state = await gameService.getGameState(gameId, userId);
            socket.emit('game:state', { game: state });

            console.info(`${socket.user.username} reconnected to game ${gameId}`);
        } catch (error) {
            console.error('Reconnect error:', error);
            socket.emit('error', { message: 'Error reconnecting to game' });
        }
    });

    /**
     * Handle disconnect during game
     */
    socket.on('disconnect', async () => {
        // Find active game for this user
        const game = await Game.findOne({
            'players.user': userId,
            status: { $in: [GAME_STATUS.WORD_SELECTION, GAME_STATUS.IN_PROGRESS] },
        });

        if (!game) {
            return;
        }

        const roomId = (await Room.findById(game.room))?.roomId;

        // Notify room
        io.to(roomId).emit('game:player-disconnected', {
            player: {
                _id: socket.user._id,  // Frontend expects _id
                username: socket.user.username,
            },
            gracePeriod: GAME.DISCONNECT_GRACE_PERIOD_MS / 1000,
        });

        // Set grace period timer
        const timerKey = `${game._id}-${userId}`;
        const timer = setTimeout(async () => {
            // Mark player as disconnected
            const currentGame = await Game.findById(game._id);
            if (currentGame) {
                const player = currentGame.getPlayer(userId);
                if (player) {
                    player.isConnected = false;
                    await currentGame.save();
                }

                // If current turn, skip
                if (currentGame.currentTurn?.toString() === userId) {
                    await gameService.skipTurn(game._id);
                    const nextGame = await Game.findById(game._id).populate('currentTurn', 'username avatar');

                    if (nextGame) {
                        io.to(roomId).emit('game:turn-skipped', {
                            reason: 'disconnect',
                            nextTurn: nextGame.currentTurn,
                        });
                    }
                }
            }

            disconnectTimers.delete(timerKey);
        }, GAME.DISCONNECT_GRACE_PERIOD_MS);

        disconnectTimers.set(timerKey, timer);
    });
};
