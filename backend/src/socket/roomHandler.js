/**
 * Room Socket Handler
 * Handles room-related real-time events
 */
const { Room, User } = require('../models');

// Track user's current room
const userRooms = new Map();

module.exports = (io, socket) => {
    const userId = socket.userId;

    /**
     * Join a room socket
     */
    socket.on('room:join', async ({ roomId }) => {
        try {
            const room = await Room.findOne({ roomId })
                .populate('players', 'username avatar isOnline')
                .populate('host', 'username avatar');

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            if (!room.hasPlayer(userId)) {
                return socket.emit('error', { message: 'You are not in this room' });
            }

            // Leave any previous room
            const previousRoom = userRooms.get(userId);
            if (previousRoom && previousRoom !== roomId) {
                socket.leave(previousRoom);
                console.log(`[room:join] Left previous room ${previousRoom}`);
            }

            // Join socket room
            socket.join(roomId);
            userRooms.set(userId, roomId);
            console.log(`[room:join] User ${userId} successfully joined socket room ${roomId}`);

            // Notify others
            socket.to(roomId).emit('room:player-joined', {
                player: {
                    _id: socket.user._id,  // Frontend expects _id, not id
                    username: socket.user.username,
                    avatar: socket.user.avatar,
                },
                playerCount: room.players.length,
            });

            // Send room state to joining user
            socket.emit('room:joined', {
                room: {
                    roomId: room.roomId,
                    name: room.name,
                    host: room.host,
                    players: room.players,
                    settings: room.settings,
                    status: room.status,
                },
            });

            console.info(`${socket.user.username} joined room ${roomId}`);
        } catch (error) {
            console.error('Room join error:', error);
            socket.emit('error', { message: 'Error joining room' });
        }
    });

    /**
     * Leave a room socket
     */
    socket.on('room:leave', async ({ roomId }) => {
        try {
            socket.leave(roomId);
            userRooms.delete(userId);

            const room = await Room.findOne({ roomId });

            if (room) {
                socket.to(roomId).emit('room:player-left', {
                    playerId: socket.user._id,  // Already correct - frontend expects playerId
                    username: socket.user.username,
                    playerCount: Math.max(0, room.players.length - 1),
                });
            }

            console.info(`${socket.user.username} left room ${roomId}`);
        } catch (error) {
            console.error('Room leave error:', error);
        }
    });

    /**
     * Update room settings (host only)
     */
    socket.on('room:update-settings', async ({ roomId, settings }) => {
        try {
            const room = await Room.findOne({ roomId });

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            if (!room.isHost(userId)) {
                return socket.emit('error', { message: 'Only host can update settings' });
            }

            // Update settings
            Object.keys(settings).forEach((key) => {
                if (room.settings[key] !== undefined) {
                    room.settings[key] = settings[key];
                }
            });

            await room.save();

            // Broadcast to room
            io.to(roomId).emit('room:settings-updated', {
                settings: room.settings,
                updatedBy: socket.user.username,
            });
        } catch (error) {
            console.error('Update settings error:', error);
            socket.emit('error', { message: 'Error updating settings' });
        }
    });

    /**
     * Kick player (host only)
     */
    socket.on('room:kick', async ({ roomId, playerId }) => {
        try {
            const room = await Room.findOne({ roomId });

            if (!room) {
                return socket.emit('error', { message: 'Room not found' });
            }

            if (!room.isHost(userId)) {
                return socket.emit('error', { message: 'Only host can kick players' });
            }

            const kickedUser = await User.findById(playerId);

            // Notify kicked player
            io.to(roomId).emit('room:player-kicked', {
                playerId,
                username: kickedUser?.username,
                kickedBy: socket.user.username,
            });

            // Remove from room (handled in API)
        } catch (error) {
            console.error('Kick player error:', error);
            socket.emit('error', { message: 'Error kicking player' });
        }
    });

    /**
     * Get current room
     */
    const getCurrentRoom = () => userRooms.get(userId);

    // Expose helpers
    socket.getCurrentRoom = getCurrentRoom;

    /**
     * Handle disconnect - clean up room tracking
     */
    socket.on('disconnect', () => {
        const roomId = userRooms.get(userId);
        if (roomId) {
            socket.to(roomId).emit('room:player-disconnected', {
                player: {
                    _id: socket.user._id,  // Frontend expects _id
                    username: socket.user.username,
                },
            });
            userRooms.delete(userId);
        }
    });
};
