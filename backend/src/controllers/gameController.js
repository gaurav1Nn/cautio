/**
 * Game Controller
 * HTTP endpoints for game operations
 */
const { Room } = require('../models');
const gameService = require('../services/gameService');
const wordService = require('../services/wordService');

/**
 * Start a new game
 * POST /api/games/start
 */
const startGame = async (req, res) => {
    try {
        const { roomId } = req.body;
        const userId = req.userId;

        // Check if user is host
        const room = await Room.findOne({ roomId });

        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'Room not found',
            });
        }

        if (!room.isHost(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only the host can start the game',
            });
        }

        const game = await gameService.startGame(roomId);

        await game.populate('wordMaster', 'username avatar');
        await game.populate('players.user', 'username avatar');
        await game.populate('currentTurn', 'username avatar');

        res.status(201).json({
            success: true,
            message: 'Game started',
            data: {
                game: game.getPublicState(userId),
            },
        });
    } catch (error) {
        console.error('Start game error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error starting game',
        });
    }
};

/**
 * Get game state
 * GET /api/games/:gameId
 */
const getGameState = async (req, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.userId;

        const state = await gameService.getGameState(gameId, userId);

        if (!state) {
            return res.status(404).json({
                success: false,
                message: 'Game not found',
            });
        }

        res.json({
            success: true,
            data: { game: state },
        });
    } catch (error) {
        console.error('Get game state error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching game state',
        });
    }
};

/**
 * Submit word (Word Master)
 * POST /api/games/:gameId/word
 */
const submitWord = async (req, res) => {
    try {
        const { gameId } = req.params;
        const { word, category, useRandom } = req.body;
        const userId = req.userId;

        const game = await gameService.submitWord(gameId, userId, word, category, useRandom);

        await game.populate('wordMaster', 'username avatar');
        await game.populate('currentTurn', 'username avatar');

        res.json({
            success: true,
            message: 'Word submitted',
            data: {
                game: game.getPublicState(userId),
            },
        });
    } catch (error) {
        console.error('Submit word error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error submitting word',
        });
    }
};

/**
 * Get random word
 * GET /api/games/random-word
 */
const getRandomWord = async (req, res) => {
    try {
        const { category = 'all' } = req.query;

        const result = await wordService.getRandomWord(category);

        res.json({
            success: true,
            data: {
                word: result.word,
                category: result.category,
            },
        });
    } catch (error) {
        console.error('Get random word error:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting random word',
        });
    }
};

/**
 * Validate a word
 * POST /api/games/validate-word
 */
const validateWord = async (req, res) => {
    try {
        const { word } = req.body;

        const result = await wordService.validateWord(word);

        res.json({
            success: true,
            data: {
                valid: result.valid,
                word: result.word,
                message: result.message,
            },
        });
    } catch (error) {
        console.error('Validate word error:', error);
        res.status(500).json({
            success: false,
            message: 'Error validating word',
        });
    }
};

module.exports = {
    startGame,
    getGameState,
    submitWord,
    getRandomWord,
    validateWord,
};
