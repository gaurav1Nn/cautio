/**
 * Socket.IO Configuration
 * Initializes and configures Socket.IO server with authentication
 */
const { Server } = require('socket.io');
const { verifyAccessToken } = require('../services/tokenService');
const { User } = require('../models');
const env = require('./env');

let io = null;

/**
 * Initialize Socket.IO server
 */
const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: env.CORS_ORIGIN,
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication required'));
            }

            // Verify token
            const decoded = verifyAccessToken(token);

            // Get user
            const user = await User.findById(decoded.userId);

            if (!user) {
                return next(new Error('User not found'));
            }

            // Attach user to socket
            socket.userId = user._id.toString();
            socket.user = user;

            next();
        } catch (error) {
            next(new Error('Invalid token'));
        }
    });

    // Register event handlers
    const roomHandler = require('../socket/roomHandler');
    const gameHandler = require('../socket/gameHandler');
    const chatHandler = require('../socket/chatHandler');

    io.on('connection', async (socket) => {
        console.info(`User connected: ${socket.user.username} (${socket.id})`);

        // Update user online status
        await User.findByIdAndUpdate(socket.userId, {
            isOnline: true,
            lastSeen: new Date(),
        });

        // Register handlers
        roomHandler(io, socket);
        gameHandler(io, socket);
        chatHandler(io, socket);

        // Handle disconnect
        socket.on('disconnect', async (reason) => {
            console.info(`User disconnected: ${socket.user.username} - ${reason}`);

            // Update user online status
            await User.findByIdAndUpdate(socket.userId, {
                isOnline: false,
                lastSeen: new Date(),
            });
        });
    });

    return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => io;

module.exports = {
    initializeSocket,
    getIO,
};
