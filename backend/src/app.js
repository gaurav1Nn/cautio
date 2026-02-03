/**
 * Express Application Setup
 * Configures middleware, routes, and error handling
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: env.isProduction() ? undefined : false,
}));

// CORS configuration
app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (env.isDevelopment()) {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser(env.COOKIE_SECRET));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// API routes (to be added in later phases)
app.get('/api', (_req, res) => {
    res.json({
        message: 'Welcome to HangOut & Hangman API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            rooms: '/api/rooms',
            games: '/api/games',
            leaderboard: '/api/leaderboard',
        },
    });
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// Global error handler
app.use((err, _req, res, _next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = env.isProduction() && statusCode === 500
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        message,
        ...(env.isDevelopment() && { stack: err.stack }),
    });
});

module.exports = app;
