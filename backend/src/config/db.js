/**
 * MongoDB Database Connection
 * Handles connection, error handling, and graceful shutdown
 */
const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB
 */
const connectDatabase = async () => {
    try {
        const conn = await mongoose.connect(env.MONGODB_URI, {
            // Mongoose 8 uses these defaults, but being explicit
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.info(`MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.info('MongoDB reconnected');
        });

        return conn;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
};

/**
 * Close database connection gracefully
 */
const closeDatabase = async () => {
    try {
        await mongoose.connection.close();
        console.info('MongoDB connection closed');
    } catch (error) {
        console.error('Error closing MongoDB connection:', error);
    }
};

module.exports = {
    connectDatabase,
    closeDatabase,
};
