/**
 * Leaderboard Controller
 * Handles leaderboard queries
 */
const { Leaderboard } = require('../models');

/**
 * Get global leaderboard
 * GET /api/leaderboard
 */
const getGlobalLeaderboard = async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const leaderboard = await Leaderboard.getGlobalLeaderboard(parseInt(limit));

        res.json({
            success: true,
            data: {
                leaderboard: leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    user: entry.user,
                    score: entry.allTimeScore,
                    gamesPlayed: entry.gamesPlayed,
                    gamesWon: entry.gamesWon,
                    winRate: entry.gamesPlayed > 0 ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) : 0,
                })),
            },
        });
    } catch (error) {
        console.error('Get global leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
        });
    }
};

/**
 * Get weekly leaderboard
 * GET /api/leaderboard/weekly
 */
const getWeeklyLeaderboard = async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const leaderboard = await Leaderboard.getWeeklyLeaderboard(parseInt(limit));

        res.json({
            success: true,
            data: {
                leaderboard: leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    user: entry.user,
                    score: entry.weeklyScore,
                    gamesPlayed: entry.gamesPlayed,
                })),
            },
        });
    } catch (error) {
        console.error('Get weekly leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
        });
    }
};

/**
 * Get monthly leaderboard
 * GET /api/leaderboard/monthly
 */
const getMonthlyLeaderboard = async (req, res) => {
    try {
        const { limit = 100 } = req.query;

        const leaderboard = await Leaderboard.getMonthlyLeaderboard(parseInt(limit));

        res.json({
            success: true,
            data: {
                leaderboard: leaderboard.map((entry, index) => ({
                    rank: index + 1,
                    user: entry.user,
                    score: entry.monthlyScore,
                    gamesPlayed: entry.gamesPlayed,
                })),
            },
        });
    } catch (error) {
        console.error('Get monthly leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching leaderboard',
        });
    }
};

/**
 * Get current user's stats
 * GET /api/leaderboard/me
 */
const getMyStats = async (req, res) => {
    try {
        const userId = req.userId;

        const entry = await Leaderboard.findOne({ user: userId }).populate('user', 'username avatar');

        if (!entry) {
            return res.json({
                success: true,
                data: {
                    stats: {
                        allTimeScore: 0,
                        weeklyScore: 0,
                        monthlyScore: 0,
                        gamesPlayed: 0,
                        gamesWon: 0,
                        winRate: 0,
                        rank: null,
                    },
                },
            });
        }

        const [globalRank, weeklyRank, monthlyRank] = await Promise.all([
            Leaderboard.getUserRank(userId, 'allTime'),
            Leaderboard.getUserRank(userId, 'weekly'),
            Leaderboard.getUserRank(userId, 'monthly'),
        ]);

        res.json({
            success: true,
            data: {
                stats: {
                    user: entry.user,
                    allTimeScore: entry.allTimeScore,
                    weeklyScore: entry.weeklyScore,
                    monthlyScore: entry.monthlyScore,
                    gamesPlayed: entry.gamesPlayed,
                    gamesWon: entry.gamesWon,
                    wordsGuessed: entry.wordsGuessed,
                    perfectRounds: entry.perfectRounds,
                    winRate: entry.gamesPlayed > 0 ? Math.round((entry.gamesWon / entry.gamesPlayed) * 100) : 0,
                    ranks: {
                        global: globalRank,
                        weekly: weeklyRank,
                        monthly: monthlyRank,
                    },
                },
            },
        });
    } catch (error) {
        console.error('Get my stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching stats',
        });
    }
};

module.exports = {
    getGlobalLeaderboard,
    getWeeklyLeaderboard,
    getMonthlyLeaderboard,
    getMyStats,
};
