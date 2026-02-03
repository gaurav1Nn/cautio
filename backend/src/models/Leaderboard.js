/**
 * Leaderboard Model
 * Tracks global, weekly, and monthly player rankings
 */
const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        allTimeScore: {
            type: Number,
            default: 0,
            index: true,
        },
        weeklyScore: {
            type: Number,
            default: 0,
            index: true,
        },
        monthlyScore: {
            type: Number,
            default: 0,
            index: true,
        },
        gamesPlayed: {
            type: Number,
            default: 0,
        },
        gamesWon: {
            type: Number,
            default: 0,
        },
        wordsGuessed: {
            type: Number,
            default: 0,
        },
        perfectRounds: {
            type: Number,
            default: 0, // Rounds where word was guessed without any wrong letters
        },
        lastPlayedAt: {
            type: Date,
            default: Date.now,
        },
        weekStartDate: {
            type: Date,
            default: () => getStartOfWeek(),
        },
        monthStartDate: {
            type: Date,
            default: () => getStartOfMonth(),
        },
    },
    {
        timestamps: true,
    }
);

// Helper functions for date calculations
function getStartOfWeek() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(now.setDate(diff));
}

function getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Virtual for win rate
leaderboardSchema.virtual('winRate').get(function () {
    if (this.gamesPlayed === 0) {
        return 0;
    }
    return Math.round((this.gamesWon / this.gamesPlayed) * 100);
});

leaderboardSchema.set('toJSON', { virtuals: true });
leaderboardSchema.set('toObject', { virtuals: true });

// Static method to update or create leaderboard entry
leaderboardSchema.statics.updateScore = async function (userId, scoreChange, stats = {}) {
    const currentWeekStart = getStartOfWeek();
    const currentMonthStart = getStartOfMonth();

    // Find existing entry
    let entry = await this.findOne({ user: userId });

    if (!entry) {
        entry = new this({ user: userId });
    }

    // Check if we need to reset weekly/monthly scores
    if (entry.weekStartDate < currentWeekStart) {
        entry.weeklyScore = 0;
        entry.weekStartDate = currentWeekStart;
    }

    if (entry.monthStartDate < currentMonthStart) {
        entry.monthlyScore = 0;
        entry.monthStartDate = currentMonthStart;
    }

    // Update scores
    entry.allTimeScore += scoreChange;
    entry.weeklyScore += scoreChange;
    entry.monthlyScore += scoreChange;

    // Update stats
    if (stats.gamesPlayed) {
        entry.gamesPlayed += stats.gamesPlayed;
    }
    if (stats.gamesWon) {
        entry.gamesWon += stats.gamesWon;
    }
    if (stats.wordsGuessed) {
        entry.wordsGuessed += stats.wordsGuessed;
    }
    if (stats.perfectRounds) {
        entry.perfectRounds += stats.perfectRounds;
    }

    entry.lastPlayedAt = new Date();

    await entry.save();
    return entry;
};

// Static method to get global leaderboard
leaderboardSchema.statics.getGlobalLeaderboard = async function (limit = 100) {
    return this.find()
        .sort({ allTimeScore: -1 })
        .limit(limit)
        .populate('user', 'username avatar')
        .lean();
};

// Static method to get weekly leaderboard
leaderboardSchema.statics.getWeeklyLeaderboard = async function (limit = 100) {
    const currentWeekStart = getStartOfWeek();

    return this.find({ weekStartDate: { $gte: currentWeekStart } })
        .sort({ weeklyScore: -1 })
        .limit(limit)
        .populate('user', 'username avatar')
        .lean();
};

// Static method to get monthly leaderboard
leaderboardSchema.statics.getMonthlyLeaderboard = async function (limit = 100) {
    const currentMonthStart = getStartOfMonth();

    return this.find({ monthStartDate: { $gte: currentMonthStart } })
        .sort({ monthlyScore: -1 })
        .limit(limit)
        .populate('user', 'username avatar')
        .lean();
};

// Static method to get user rank
leaderboardSchema.statics.getUserRank = async function (userId, type = 'allTime') {
    const scoreField = type === 'weekly' ? 'weeklyScore' : type === 'monthly' ? 'monthlyScore' : 'allTimeScore';

    const userEntry = await this.findOne({ user: userId });
    if (!userEntry) {
        return null;
    }

    const rank = await this.countDocuments({
        [scoreField]: { $gt: userEntry[scoreField] },
    });

    return rank + 1;
};

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard;
