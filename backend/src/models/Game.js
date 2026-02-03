/**
 * Game Model
 * Stores game state, scores, and round information
 */
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
    {
        room: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room',
            required: true,
        },
        currentRound: {
            type: Number,
            default: 1,
        },
        totalRounds: {
            type: Number,
            default: 5,
        },
        wordMaster: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        word: {
            type: String,
            default: null,
            select: false, // Don't expose in queries (security)
        },
        wordLength: {
            type: Number,
            default: 0,
        },
        category: {
            type: String,
            default: 'all',
        },
        guessedLetters: {
            type: [String],
            default: [],
        },
        correctLetters: {
            type: [String],
            default: [],
        },
        incorrectLetters: {
            type: [String],
            default: [],
        },
        incorrectGuesses: {
            type: Number,
            default: 0,
        },
        maxIncorrectGuesses: {
            type: Number,
            default: 6,
        },
        hints: {
            type: [String],
            default: [],
        },
        hintsRemaining: {
            type: Number,
            default: 3,
        },
        players: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                score: {
                    type: Number,
                    default: 0,
                },
                isConnected: {
                    type: Boolean,
                    default: true,
                },
                correctGuesses: {
                    type: Number,
                    default: 0,
                },
                wrongGuesses: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        currentTurn: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        turnOrder: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        turnStartTime: {
            type: Date,
            default: null,
        },
        turnTimeLimit: {
            type: Number,
            default: 30, // seconds
        },
        status: {
            type: String,
            enum: ['word-selection', 'in-progress', 'round-end', 'game-over'],
            default: 'word-selection',
        },
        roundWinner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        roundHistory: [
            {
                round: Number,
                word: String,
                wordMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                wasWordGuessed: Boolean,
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
gameSchema.index({ room: 1 });
gameSchema.index({ status: 1 });

// Get masked word dynamically (instead of storing it)
gameSchema.methods.getMaskedWord = function () {
    if (!this.word) {
        return '';
    }
    return this.word
        .split('')
        .map((char) => {
            if (char === ' ') {
                return ' ';
            }
            return this.correctLetters.includes(char.toLowerCase()) ? char : '_';
        })
        .join(' ');
};

// Check if word is fully revealed
gameSchema.methods.isWordComplete = function () {
    if (!this.word) {
        return false;
    }
    return this.word
        .toLowerCase()
        .split('')
        .filter((char) => char !== ' ')
        .every((char) => this.correctLetters.includes(char));
};

// Check if game is over (max incorrect guesses reached)
gameSchema.methods.isGameOver = function () {
    return this.incorrectGuesses >= this.maxIncorrectGuesses;
};

// Get player by user ID
gameSchema.methods.getPlayer = function (userId) {
    return this.players.find((p) => p.user.toString() === userId.toString());
};

// Update player score
gameSchema.methods.updatePlayerScore = function (userId, points) {
    const player = this.getPlayer(userId);
    if (player) {
        player.score += points;
    }
};

// Get current turn index
gameSchema.methods.getCurrentTurnIndex = function () {
    return this.turnOrder.findIndex((id) => id.toString() === this.currentTurn?.toString());
};

// Get next player (excluding word master and disconnected)
gameSchema.methods.getNextPlayer = function () {
    const currentIndex = this.getCurrentTurnIndex();
    const connectedPlayers = this.turnOrder.filter((userId) => {
        const player = this.getPlayer(userId);
        return (
            player?.isConnected && userId.toString() !== this.wordMaster.toString()
        );
    });

    if (connectedPlayers.length === 0) {
        return null;
    }

    // Find next connected player in order
    for (let i = 1; i <= this.turnOrder.length; i++) {
        const nextIndex = (currentIndex + i) % this.turnOrder.length;
        const nextUserId = this.turnOrder[nextIndex];

        if (connectedPlayers.some((id) => id.toString() === nextUserId.toString())) {
            return nextUserId;
        }
    }

    return connectedPlayers[0];
};

// Get game state for frontend (without exposing word)
gameSchema.methods.getPublicState = function (userId) {
    const isWordMaster = this.wordMaster?.toString() === userId?.toString();

    return {
        id: this._id,
        room: this.room,
        currentRound: this.currentRound,
        totalRounds: this.totalRounds,
        wordMaster: this.wordMaster,
        maskedWord: this.getMaskedWord(),
        wordLength: this.wordLength,
        category: this.category,
        guessedLetters: this.guessedLetters,
        incorrectGuesses: this.incorrectGuesses,
        maxIncorrectGuesses: this.maxIncorrectGuesses,
        hints: this.hints,
        hintsRemaining: this.hintsRemaining,
        players: this.players,
        currentTurn: this.currentTurn,
        turnOrder: this.turnOrder,
        status: this.status,
        roundWinner: this.roundWinner,
        winner: this.winner,
        isWordMaster,
        // Only show word if user is word master and game is not in word-selection
        word: isWordMaster && this.status !== 'word-selection' ? this.word : undefined,
    };
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
