/**
 * Room Model
 * Stores game room information and settings
 */
const mongoose = require('mongoose');
const crypto = require('crypto');

const roomSchema = new mongoose.Schema(
    {
        roomId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Room name is required'],
            trim: true,
            maxlength: [30, 'Room name cannot exceed 30 characters'],
        },
        host: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        players: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        password: {
            type: String,
            default: null,
            select: false, // Don't include in queries by default
        },
        isPrivate: {
            type: Boolean,
            default: false,
        },
        settings: {
            maxPlayers: {
                type: Number,
                default: 6,
                min: [2, 'Minimum 2 players required'],
                max: [6, 'Maximum 6 players allowed'],
            },
            rounds: {
                type: Number,
                default: 5,
                min: [1, 'Minimum 1 round required'],
                max: [10, 'Maximum 10 rounds allowed'],
            },
            turnTime: {
                type: Number,
                default: 30,
                min: [15, 'Minimum 15 seconds per turn'],
                max: [60, 'Maximum 60 seconds per turn'],
            },
            category: {
                type: String,
                default: 'all',
                enum: ['all', 'movies', 'animals', 'technology', 'sports', 'food', 'countries', 'science'],
            },
        },
        status: {
            type: String,
            enum: ['waiting', 'playing', 'finished'],
            default: 'waiting',
        },
        currentGame: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Game',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Generate unique room ID
roomSchema.statics.generateRoomId = function () {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character ID
};

// Hash room password before saving
roomSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    try {
        const bcrypt = require('bcrypt');
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        this.isPrivate = true;
        next();
    } catch (error) {
        next(error);
    }
});

// Compare room password
roomSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) {
        return true; // No password set
    }
    const bcrypt = require('bcrypt');
    return bcrypt.compare(candidatePassword, this.password);
};

// Check if room is full
roomSchema.methods.isFull = function () {
    return this.players.length >= this.settings.maxPlayers;
};

// Check if user is in room
roomSchema.methods.hasPlayer = function (userId) {
    return this.players.some((player) => player.toString() === userId.toString());
};

// Check if user is host
roomSchema.methods.isHost = function (userId) {
    return this.host.toString() === userId.toString();
};

// Get public room info
roomSchema.methods.toPublicInfo = function () {
    return {
        roomId: this.roomId,
        name: this.name,
        host: this.host,
        playerCount: this.players.length,
        maxPlayers: this.settings.maxPlayers,
        isPrivate: this.isPrivate,
        category: this.settings.category,
        status: this.status,
        createdAt: this.createdAt,
    };
};

// Virtual for available slots
roomSchema.virtual('availableSlots').get(function () {
    return this.settings.maxPlayers - this.players.length;
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
