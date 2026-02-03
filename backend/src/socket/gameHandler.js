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
     * Submit word (Word Master)
     */
    socket.on('game:submit-word', async ({ gameId, word, category, useRandom }) => {
        try {
            const game = await gameService.submitWord(gameId, userId, word, category, useRandom);

            const roomId = socket.getCurrentRoom?.() || (await Room.findById(game.room))?.roomId;

            await game.populate('wordMaster', 'username avatar');
            await game.populate('currentTurn', 'username avatar');

            // Broadcast word set (without revealing word)
            io.to(roomId).emit('game:word-set', {
                wordLength: game.wordLength,
                category: game.category,
                currentTurn: game.currentTurn,
                maskedWord: game.getMaskedWord(),
                message: 'Word has been set! Let the guessing begin!',
            });

            // Start turn timer
            gameService.startTurnTimer(gameId, io, roomId, game.turnTimeLimit);

            // Send full game state to each player
            for (const player of game.players) {
                const state = game.getPublicState(player.user.toString());
                io.to(roomId).emit('game:state', { game: state });
            }
        } catch (error) {
            console.error('Submit word error:', error);
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Guess a letter
     */
    socket.on('game:guess', async ({ gameId, letter }) => {
        try {
            const { result, wordComplete, gameOver, game } = await gameService.guessLetter(
                gameId,
                userId,
                letter
            );

            const roomId = socket.getCurrentRoom?.() || (await Room.findById(game.room))?.roomId;

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
    socket.on('game:send-hint', async ({ gameId, hint }) => {
        try {
            const game = await gameService.sendHint(gameId, userId, hint);

            const roomId = socket.getCurrentRoom?.() || (await Room.findById(game.room))?.roomId;

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
                    id: socket.user._id,
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
                id: socket.user._id,
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
