/**
 * Server Entry Point
 * Initializes HTTP server, Socket.IO, and database connection
 */
const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const { connectDatabase, closeDatabase } = require('./src/config/db');

// Create HTTP server
const server = http.createServer(app);

// Socket.IO will be initialized in Phase 6
// const { initializeSocket } = require('./src/config/socket');
// initializeSocket(server);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
    console.info(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
        console.info('HTTP server closed');

        // Close database connection
        await closeDatabase();

        process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDatabase();

        server.listen(env.PORT, () => {
            console.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎮 HangOut & Hangman Server                             ║
║                                                           ║
║   Environment: ${env.NODE_ENV.padEnd(40)}║
║   Port: ${String(env.PORT).padEnd(47)}║
║   Health: http://localhost:${env.PORT}/health${' '.repeat(25)}║
║   API: http://localhost:${env.PORT}/api${' '.repeat(28)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
