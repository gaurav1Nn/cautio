import { io } from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '@/utils/constants';
import authService from '@/services/authService';

class SocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }
  
  /**
   * Connect to socket server
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }
    
    const token = authService.getAccessToken();
    
    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    this.setupDefaultListeners();
    
    return this.socket;
  }
  
  /**
   * Setup default event listeners
   */
  setupDefaultListeners() {
    this.socket.on(SOCKET_EVENTS.CONNECT, () => {
      console.log('🔌 Socket connected:', this.socket.id);
    });
    
    this.socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
    
    this.socket.on(SOCKET_EVENTS.ERROR, (error) => {
      console.error('🔌 Socket error:', error);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
    });
  }
  
  /**
   * Disconnect from socket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  /**
   * Emit an event
   */
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit:', event);
    }
  }
  
  /**
   * Listen for an event
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }
  
  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
  
  /**
   * Listen for event once
   */
  once(event, callback) {
    if (this.socket) {
      this.socket.once(event, callback);
    }
  }
  
  /**
   * Join a room
   */
  joinRoom(roomId) {
    this.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId });
  }
  
  /**
   * Leave a room
   */
  leaveRoom(roomId) {
    this.emit(SOCKET_EVENTS.ROOM_LEAVE, { roomId });
  }
  
  /**
   * Send a chat message
   */
  sendMessage(roomId, message) {
    this.emit(SOCKET_EVENTS.CHAT_MESSAGE, { roomId, message });
  }
  
  /**
   * Guess a letter
   */
  guessLetter(gameId, letter) {
    this.emit(SOCKET_EVENTS.GAME_GUESS, { gameId, letter });
  }
  
  /**
   * Send a hint (Word Master)
   */
  sendHint(gameId, hint) {
    this.emit(SOCKET_EVENTS.GAME_SEND_HINT, { gameId, hint });
  }
  
  /**
   * Check if connected
   */
  isConnected() {
    return this.socket?.connected || false;
  }
  
  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }
}

// Export singleton instance
const socketClient = new SocketClient();
export default socketClient;