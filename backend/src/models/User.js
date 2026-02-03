/**
 * User Model
 * Stores user account information and game statistics
 */
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            minlength: [3, 'Username must be at least 3 characters'],
            maxlength: [20, 'Username cannot exceed 20 characters'],
            match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't include password in queries by default
        },
        avatar: {
            type: String,
            default: null,
        },
        stats: {
            gamesPlayed: { type: Number, default: 0 },
            gamesWon: { type: Number, default: 0 },
            totalScore: { type: Number, default: 0 },
            wordsGuessed: { type: Number, default: 0 },
            correctLetters: { type: Number, default: 0 },
            wrongGuesses: { type: Number, default: 0 },
        },
        isOnline: {
            type: Boolean,
            default: false,
        },
        lastSeen: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries (username and email already indexed via unique: true)
userSchema.index({ 'stats.totalScore': -1 }); // For leaderboard

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Get public profile (without sensitive data)
userSchema.methods.toPublicProfile = function () {
    return {
        id: this._id,
        username: this.username,
        avatar: this.avatar,
        stats: this.stats,
        isOnline: this.isOnline,
        lastSeen: this.lastSeen,
        createdAt: this.createdAt,
    };
};

// Virtual for win rate
userSchema.virtual('winRate').get(function () {
    if (this.stats.gamesPlayed === 0) {
        return 0;
    }
    return Math.round((this.stats.gamesWon / this.stats.gamesPlayed) * 100);
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
