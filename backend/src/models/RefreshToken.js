/**
 * RefreshToken Model
 * Stores refresh tokens for multi-device session management
 */
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        userAgent: {
            type: String,
            default: null,
        },
        ipAddress: {
            type: String,
            default: null,
        },
        expiresAt: {
            type: Date,
            required: true,
            // Index defined below as TTL index
        },
        isRevoked: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient lookups
refreshTokenSchema.index({ user: 1, isRevoked: 1 });

// TTL index - automatically delete expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create a new refresh token
refreshTokenSchema.statics.createToken = async function (userId, token, expiresAt, metadata = {}) {
    return this.create({
        token,
        user: userId,
        expiresAt,
        userAgent: metadata.userAgent || null,
        ipAddress: metadata.ipAddress || null,
    });
};

// Static method to find valid token
refreshTokenSchema.statics.findValidToken = async function (token) {
    return this.findOne({
        token,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
    }).populate('user', '-password');
};

// Static method to revoke a token
refreshTokenSchema.statics.revokeToken = async function (token) {
    return this.updateOne({ token }, { isRevoked: true });
};

// Static method to revoke all tokens for a user
refreshTokenSchema.statics.revokeAllUserTokens = async function (userId) {
    return this.updateMany({ user: userId, isRevoked: false }, { isRevoked: true });
};

// Static method to get active sessions for a user
refreshTokenSchema.statics.getActiveSessions = async function (userId) {
    return this.find({
        user: userId,
        isRevoked: false,
        expiresAt: { $gt: new Date() },
    }).select('userAgent ipAddress createdAt');
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
