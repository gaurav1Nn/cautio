/**
 * Socket Service
 * Handles real-time communication with the backend via Socket.IO
 */
import { io } from 'socket.io-client';
import { getAccessToken } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

/**
 * Initialize socket connection with authentication
 */
export const connectSocket = () => {
    if (socket?.connected) {
        return socket;
    }

    const token = getAccessToken();

    socket = io(SOCKET_URL, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    // Connection event handlers
    socket.on('connect', () => {
        console.info('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.info('Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
    });

    return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

// ============ Room Events ============

export const joinRoom = (roomId) => {
    socket?.emit('room:join', { roomId });
};

export const leaveRoom = (roomId) => {
    socket?.emit('room:leave', { roomId });
};

export const onPlayerJoined = (callback) => {
    socket?.on('room:player-joined', callback);
};

export const onPlayerLeft = (callback) => {
    socket?.on('room:player-left', callback);
};

export const onSettingsUpdated = (callback) => {
    socket?.on('room:settings-updated', callback);
};

// ============ Game Events ============

export const onGameStart = (callback) => {
    socket?.on('game:start', callback);
};

export const onWordSelection = (callback) => {
    socket?.on('game:word-selection', callback);
};

export const onWordSet = (callback) => {
    socket?.on('game:word-set', callback);
};

export const submitGuess = (letter) => {
    socket?.emit('game:guess', { letter });
};

export const onLetterResult = (callback) => {
    socket?.on('game:letter-result', callback);
};

export const onWordUpdate = (callback) => {
    socket?.on('game:word-update', callback);
};

export const onTurnChange = (callback) => {
    socket?.on('game:turn-change', callback);
};

export const onTimerTick = (callback) => {
    socket?.on('game:timer-tick', callback);
};

export const onTurnSkipped = (callback) => {
    socket?.on('game:turn-skipped', callback);
};

export const sendHint = (hint) => {
    socket?.emit('game:send-hint', { hint });
};

export const onHint = (callback) => {
    socket?.on('game:hint', callback);
};

export const onRoundEnd = (callback) => {
    socket?.on('game:round-end', callback);
};

export const onGameEnd = (callback) => {
    socket?.on('game:end', callback);
};

export const onScoresUpdate = (callback) => {
    socket?.on('game:scores', callback);
};

export const onPlayerDisconnected = (callback) => {
    socket?.on('game:player-disconnected', callback);
};

export const onPlayerReconnected = (callback) => {
    socket?.on('game:player-reconnected', callback);
};

export const reconnectToGame = (gameId) => {
    socket?.emit('game:reconnect', { gameId });
};

export const onGameState = (callback) => {
    socket?.on('game:state', callback);
};

// ============ Chat Events ============

export const sendChatMessage = (message) => {
    socket?.emit('chat:message', { message });
};

export const onChatMessage = (callback) => {
    socket?.on('chat:broadcast', callback);
};

export const onSystemMessage = (callback) => {
    socket?.on('chat:system', callback);
};

// ============ Cleanup ============

export const removeAllListeners = () => {
    socket?.removeAllListeners();
};
