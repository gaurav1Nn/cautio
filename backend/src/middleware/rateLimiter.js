/**
 * Rate Limiter Middleware
 * Configures rate limiting for different endpoint types
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Create custom rate limiter
 */
const createLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || env.RATE_LIMIT_WINDOW_MS,
        max: options.max,
        message: {
            success: false,
            message: options.message || 'Too many requests, please try again later',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

/**
 * Auth rate limiter - strict limits for login/signup
 */
const authLimiter = createLimiter({
    max: env.AUTH_RATE_LIMIT_MAX,
    message: 'Too many authentication attempts, please try again after a minute',
});

/**
 * Game rate limiter - moderate limits for game actions
 */
const gameLimiter = createLimiter({
    max: env.GAME_RATE_LIMIT_MAX,
    message: 'Too many game actions, please slow down',
});

/**
 * General API rate limiter
 */
const apiLimiter = createLimiter({
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later',
});

module.exports = {
    createLimiter,
    authLimiter,
    gameLimiter,
    apiLimiter,
};
