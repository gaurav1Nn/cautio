/**
 * Game Routes
 * Defines game endpoints
 */
const express = require('express');
const router = express.Router();

const gameController = require('../controllers/gameController');
const { protect } = require('../middleware/authMiddleware');
const { gameLimiter } = require('../middleware/rateLimiter');
const { validate, validateParams } = require('../middleware/validation');
const {
    startGameSchema,
    submitWordSchema,
    gameIdParamSchema,
} = require('../validators/gameValidator');

// All game routes require authentication
router.use(protect);

// Game management
router.post('/start', gameLimiter, validate(startGameSchema), gameController.startGame);
router.get('/random-word', gameController.getRandomWord);
router.post('/validate-word', gameController.validateWord);
router.get('/:gameId', validateParams(gameIdParamSchema), gameController.getGameState);
router.post('/:gameId/word', validateParams(gameIdParamSchema), validate(submitWordSchema), gameController.submitWord);

module.exports = router;
