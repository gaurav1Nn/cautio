/**
 * Leaderboard Routes
 * Defines leaderboard endpoints
 */
const express = require('express');
const router = express.Router();

const leaderboardController = require('../controllers/leaderboardController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// Public leaderboards
router.get('/', optionalAuth, leaderboardController.getGlobalLeaderboard);
router.get('/weekly', optionalAuth, leaderboardController.getWeeklyLeaderboard);
router.get('/monthly', optionalAuth, leaderboardController.getMonthlyLeaderboard);

// Protected - get own stats
router.get('/me', protect, leaderboardController.getMyStats);

module.exports = router;
