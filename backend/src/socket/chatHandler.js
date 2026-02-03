/**
 * Chat Socket Handler
 * Handles in-room chat messages
 */

module.exports = (io, socket) => {
    /**
     * Send chat message
     */
    socket.on('chat:message', ({ message }) => {
        try {
            const roomId = socket.getCurrentRoom?.();

            if (!roomId) {
                return socket.emit('error', { message: 'You are not in a room' });
            }

            if (!message || message.trim().length === 0) {
                return;
            }

            // Limit message length
            const trimmedMessage = message.substring(0, 200);

            // Broadcast to room (frontend expects userId, username, avatar at top level)
            io.to(roomId).emit('chat:broadcast', {
                id: Date.now(),
                userId: socket.user._id,
                username: socket.user.username,
                avatar: socket.user.avatar,
                message: trimmedMessage,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Chat error:', error);
        }
    });

    /**
     * System message (for game events)
     */
    socket.emitSystemMessage = (roomId, message, type = 'info') => {
        io.to(roomId).emit('chat:system', {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString(),
        });
    };
};
