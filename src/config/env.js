/**
 * Environment Configuration
 * Loads and validates environment variables
 */
require('dotenv').config();

const env = {
    // Server
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Database
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hangout-hangman',

    // JWT
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

    // External APIs
    DICTIONARY_API_URL: process.env.DICTIONARY_API_URL || 'https://api.dictionaryapi.dev/api/v2/entries/en',
    RANDOM_WORD_API_URL: process.env.RANDOM_WORD_API_URL || 'https://random-word-api.herokuapp.com/word',

    // Cookie
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    COOKIE_SECURE: process.env.COOKIE_SECURE === 'true',

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
    GAME_RATE_LIMIT_MAX: parseInt(process.env.GAME_RATE_LIMIT_MAX) || 30,

    // Helpers
    isDevelopment: () => env.NODE_ENV === 'development',
    isProduction: () => env.NODE_ENV === 'production',
    isTest: () => env.NODE_ENV === 'test',
};

// Validate required environment variables in production
const validateEnv = () => {
    const required = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET'];

    if (env.isProduction()) {
        required.push('MONGODB_URI');
    }

    const missing = required.filter(key => !env[key]);

    if (missing.length > 0 && !env.isTest()) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please check your .env file');
        process.exit(1);
    }
};

// Only validate in non-test environments
if (!env.isTest()) {
    validateEnv();
}

module.exports = env;
