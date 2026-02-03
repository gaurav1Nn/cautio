/**
 * Token Service
 * Handles JWT access and refresh token generation and verification
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generate access token (short-lived: 15 minutes)
 */
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId },
        env.JWT_ACCESS_SECRET,
        { expiresIn: env.JWT_ACCESS_EXPIRY }
    );
};

/**
 * Generate refresh token (long-lived: 7 days)
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRY }
    );
};

/**
 * Calculate refresh token expiry date
 */
const getRefreshTokenExpiry = () => {
    const expiry = env.JWT_REFRESH_EXPIRY;
    const value = parseInt(expiry);
    const unit = expiry.slice(-1);

    let milliseconds;
    switch (unit) {
        case 'd':
            milliseconds = value * 24 * 60 * 60 * 1000;
            break;
        case 'h':
            milliseconds = value * 60 * 60 * 1000;
            break;
        case 'm':
            milliseconds = value * 60 * 1000;
            break;
        default:
            milliseconds = 7 * 24 * 60 * 60 * 1000; // Default 7 days
    }

    return new Date(Date.now() + milliseconds);
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, env.JWT_ACCESS_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired access token');
    }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, env.JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
};

/**
 * Set refresh token as HTTP-only cookie
 */
const setRefreshTokenCookie = (res, token) => {
    const expiryDate = getRefreshTokenExpiry();

    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: env.isProduction(),
        sameSite: 'strict',
        expires: expiryDate,
        path: '/api/auth',
    });
};

/**
 * Clear refresh token cookie
 */
const clearRefreshTokenCookie = (res) => {
    res.cookie('refreshToken', '', {
        httpOnly: true,
        secure: env.isProduction(),
        sameSite: 'strict',
        expires: new Date(0),
        path: '/api/auth',
    });
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    getRefreshTokenExpiry,
    verifyAccessToken,
    verifyRefreshToken,
    setRefreshTokenCookie,
    clearRefreshTokenCookie,
};
