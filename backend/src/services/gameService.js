/**
 * Game Service
 * Core game logic for Hangman gameplay
 */
const { Game, Room, User, Leaderboard } = require('../models');
const wordService = require('./wordService');
const { SCORING, GAME, GAME_STATUS, ROOM_STATUS } = require('../utils/constants');

// Store active turn timers
const turnTimers = new Map();

/**
 * Start a new game
 */
const startGame = async (roomId, io) => {
    const room = await Room.findOne({ roomId }).populate('players', 'username');

    if (!room) {
        throw new Error('Room not found');
    }

    if (room.players.length < GAME.MIN_PLAYERS) {
        throw new Error(`Minimum ${GAME.MIN_PLAYERS} players required to start`);
    }

    if (room.status === ROOM_STATUS.PLAYING) {
        throw new Error('Game already in progress');
    }

    // Create player scores array
    const players = room.players.map((player) => ({
        user: player._id,
        score: 0,
        isConnected: true,
        correctGuesses: 0,
        wrongGuesses: 0,
    }));

    // Determine turn order (random)
    const turnOrder = [...room.players.map((p) => p._id)].sort(() => Math.random() - 0.5);

    // First player is Word Master
    const wordMaster = turnOrder[0];

    // Create game
    const game = await Game.create({
        room: room._id,
        currentRound: 1,
        totalRounds: room.settings.rounds,
        wordMaster,
        players,
        turnOrder,
        currentTurn: turnOrder[1] || turnOrder[0], // Second player guesses first
        turnTimeLimit: room.settings.turnTime,
        status: GAME_STATUS.WORD_SELECTION,
    });

    // Update room
    room.status = ROOM_STATUS.PLAYING;
    room.currentGame = game._id;
    await room.save();

    return game;
};

/**
 * Submit word for the round
 */
const submitWord = async (gameId, userId, word, category, useRandom = false) => {
    const game = await Game.findById(gameId);

    if (!game) {
        throw new Error('Game not found');
    }

    if (game.wordMaster.toString() !== userId.toString()) {
        throw new Error('Only the Word Master can submit a word');
    }

    if (game.status !== GAME_STATUS.WORD_SELECTION) {
        throw new Error('Not in word selection phase');
    }

    let selectedWord;
    let selectedCategory = category || 'all';

    if (useRandom) {
        const result = await wordService.getRandomWord(category);
        selectedWord = result.word;
        selectedCategory = result.category;
    } else {
        // Validate the word
        const validation = await wordService.validateWord(word);
        if (!validation.valid) {
            throw new Error(validation.message);
        }
        selectedWord = validation.word;
    }

    // Update game
    game.word = selectedWord;
    game.wordLength = wordService.getWordLength(selectedWord);
    game.category = selectedCategory;
    game.status = GAME_STATUS.IN_PROGRESS;
    game.turnStartTime = new Date();
    game.guessedLetters = [];
    game.correctLetters = [];
    game.incorrectLetters = [];
    game.incorrectGuesses = 0;
    game.hints = [];
    game.hintsRemaining = GAME.MAX_HINTS;

    await game.save();

    return game;
};

/**
 * Process a letter guess
 */
const guessLetter = async (gameId, userId, letter) => {
    const game = await Game.findById(gameId).select('+word');

    if (!game) {
        throw new Error('Game not found');
    }

    if (game.status !== GAME_STATUS.IN_PROGRESS) {
        throw new Error('Game is not in progress');
    }

    if (game.currentTurn.toString() !== userId.toString()) {
        throw new Error('Not your turn');
    }

    if (game.wordMaster.toString() === userId.toString()) {
        throw new Error('Word Master cannot guess');
    }

    const lowerLetter = letter.toLowerCase();

    // Check if letter already guessed
    if (game.guessedLetters.includes(lowerLetter)) {
        throw new Error('Letter already guessed');
    }

    // Add to guessed letters
    game.guessedLetters.push(lowerLetter);

    // Check if correct
    const result = wordService.checkLetter(game.word, lowerLetter);
    const player = game.getPlayer(userId);

    if (result.correct) {
        game.correctLetters.push(lowerLetter);
        player.correctGuesses++;
        player.score += SCORING.CORRECT_LETTER;
    } else {
        game.incorrectLetters.push(lowerLetter);
        game.incorrectGuesses++;
        player.wrongGuesses++;
        player.score += SCORING.WRONG_GUESS;
    }

    // Check win/lose conditions
    const wordComplete = wordService.isWordComplete(game.word, game.correctLetters);
    const gameOver = game.incorrectGuesses >= game.maxIncorrectGuesses;

    if (wordComplete) {
        // Player wins the round
        player.score += SCORING.SOLVE_WORD;
        game.roundWinner = userId;

        // Word Master gets consolation points
        const wordMasterPlayer = game.getPlayer(game.wordMaster);
        if (wordMasterPlayer) {
            wordMasterPlayer.score += SCORING.WORD_MASTER_LOSE;
        }

        game.status = GAME_STATUS.ROUND_END;
    } else if (gameOver) {
        // Word Master wins
        const wordMasterPlayer = game.getPlayer(game.wordMaster);
        if (wordMasterPlayer) {
            wordMasterPlayer.score += SCORING.WORD_MASTER_WIN;
        }

        game.status = GAME_STATUS.ROUND_END;
    }

    // Record round history if round ended
    if (game.status === GAME_STATUS.ROUND_END) {
        game.roundHistory.push({
            round: game.currentRound,
            word: game.word,
            wordMaster: game.wordMaster,
            winner: game.roundWinner,
            wasWordGuessed: wordComplete,
        });

        clearTurnTimer(gameId);
    }

    await game.save();

    return {
        result,
        wordComplete,
        gameOver,
        game,
    };
};

/**
 * Move to next turn
 */
const nextTurn = async (gameId) => {
    const game = await Game.findById(gameId);

    if (!game) {
        throw new Error('Game not found');
    }

    const nextPlayer = game.getNextPlayer();

    if (!nextPlayer) {
        // No connected players left
        throw new Error('No connected players');
    }

    game.currentTurn = nextPlayer;
    game.turnStartTime = new Date();
    await game.save();

    return game;
};

/**
 * Skip turn (timeout or disconnect)
 */
const skipTurn = async (gameId) => {
    try {
        const game = await Game.findById(gameId);
        if (!game || game.status !== GAME_STATUS.IN_PROGRESS) {
            return null;
        }

        return await nextTurn(gameId);
    } catch (error) {
        console.error('Skip turn error:', error);
        return null;
    }
};

/**
 * Start next round
 */
const nextRound = async (gameId) => {
    const game = await Game.findById(gameId).select('+word');

    if (!game) {
        throw new Error('Game not found');
    }

    if (game.currentRound >= game.totalRounds) {
        // Game is over
        return await endGame(gameId);
    }

    // Move to next round
    game.currentRound++;

    // Rotate Word Master
    const currentWMIndex = game.turnOrder.findIndex(
        (id) => id.toString() === game.wordMaster.toString()
    );
    const nextWMIndex = (currentWMIndex + 1) % game.turnOrder.length;
    game.wordMaster = game.turnOrder[nextWMIndex];

    // Reset round state
    game.word = null;
    game.wordLength = 0;
    game.guessedLetters = [];
    game.correctLetters = [];
    game.incorrectLetters = [];
    game.incorrectGuesses = 0;
    game.hints = [];
    game.hintsRemaining = GAME.MAX_HINTS;
    game.roundWinner = null;
    game.status = GAME_STATUS.WORD_SELECTION;

    // Set first guesser (not Word Master)
    const guessers = game.turnOrder.filter(
        (id) => id.toString() !== game.wordMaster.toString()
    );
    game.currentTurn = guessers[0] || game.turnOrder[0];

    await game.save();

    return game;
};

/**
 * End the game
 */
const endGame = async (gameId) => {
    const game = await Game.findById(gameId).populate('players.user', 'username');

    if (!game) {
        throw new Error('Game not found');
    }

    // Determine winner (highest score)
    const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
    game.winner = sortedPlayers[0]?.user;
    game.status = GAME_STATUS.GAME_OVER;

    await game.save();

    // Update room status
    await Room.findByIdAndUpdate(game.room, {
        status: ROOM_STATUS.WAITING,
        currentGame: null,
    });

    // Update player stats and leaderboard
    for (const player of game.players) {
        const isWinner = player.user.toString() === game.winner?.toString();

        // Update user stats
        await User.findByIdAndUpdate(player.user, {
            $inc: {
                'stats.gamesPlayed': 1,
                'stats.gamesWon': isWinner ? 1 : 0,
                'stats.totalScore': player.score,
                'stats.wordsGuessed': player.correctGuesses,
                'stats.correctLetters': player.correctGuesses,
                'stats.wrongGuesses': player.wrongGuesses,
            },
        });

        // Update leaderboard
        await Leaderboard.updateScore(player.user, player.score, {
            gamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
        });
    }

    clearTurnTimer(gameId);

    return game;
};

/**
 * Send a hint (Word Master only)
 */
const sendHint = async (gameId, userId, hintText) => {
    const game = await Game.findById(gameId);

    if (!game) {
        throw new Error('Game not found');
    }

    if (game.wordMaster.toString() !== userId.toString()) {
        throw new Error('Only the Word Master can send hints');
    }

    if (game.hintsRemaining <= 0) {
        throw new Error('No hints remaining');
    }

    if (game.status !== GAME_STATUS.IN_PROGRESS) {
        throw new Error('Game is not in progress');
    }

    // Add hint
    game.hints.push(hintText);
    game.hintsRemaining--;

    // Deduct points from Word Master
    const wordMasterPlayer = game.getPlayer(userId);
    if (wordMasterPlayer) {
        wordMasterPlayer.score += SCORING.HINT_COST;
    }

    await game.save();

    return game;
};

/**
 * Get game state for a user
 */
const getGameState = async (gameId, userId) => {
    const game = await Game.findById(gameId)
        .populate('wordMaster', 'username avatar')
        .populate('players.user', 'username avatar')
        .populate('currentTurn', 'username avatar')
        .populate('roundWinner', 'username avatar')
        .populate('winner', 'username avatar');

    if (!game) {
        return null;
    }

    return game.getPublicState(userId);
};

/**
 * Turn timer management
 */
const startTurnTimer = (gameId, io, roomId, turnTimeSeconds = GAME.TURN_TIME_SECONDS) => {
    clearTurnTimer(gameId);

    let timeLeft = turnTimeSeconds;

    const timer = setInterval(async () => {
        timeLeft--;

        // Broadcast timer tick
        if (io) {
            io.to(roomId).emit('game:timer-tick', { timeLeft, gameId });
        }

        if (timeLeft <= 0) {
            clearTurnTimer(gameId);

            // Auto-skip turn
            const game = await skipTurn(gameId);
            if (game && io) {
                io.to(roomId).emit('game:turn-skipped', {
                    reason: 'timeout',
                    nextTurn: game.currentTurn,
                });
            }
        }
    }, 1000);

    turnTimers.set(gameId.toString(), timer);
};

const clearTurnTimer = (gameId) => {
    const key = gameId.toString();
    if (turnTimers.has(key)) {
        clearInterval(turnTimers.get(key));
        turnTimers.delete(key);
    }
};

module.exports = {
    startGame,
    submitWord,
    guessLetter,
    nextTurn,
    skipTurn,
    nextRound,
    endGame,
    sendHint,
    getGameState,
    startTurnTimer,
    clearTurnTimer,
};
