import api from './api';

const roomService = {
  /**
   * Create a new room
   */
  async createRoom(roomData) {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },
  
  /**
   * Get list of public rooms
   */
  async getRooms(params = {}) {
    const response = await api.get('/rooms', { params });
    return response.data;
  },
  
  /**
   * Get room by ID
   */
  async getRoomById(roomId) {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },
  
  /**
   * Join a room
   */
  async joinRoom(roomId, password = null) {
    const response = await api.post(`/rooms/${roomId}/join`, { password });
    return response.data;
  },
  
  /**
   * Leave a room
   */
  async leaveRoom(roomId) {
    const response = await api.post(`/rooms/${roomId}/leave`);
    return response.data;
  },
  
  /**
   * Update room settings (host only)
   */
  async updateRoomSettings(roomId, settings) {
    const response = await api.patch(`/rooms/${roomId}/settings`, settings);
    return response.data;
  },
  
  /**
   * Kick a player (host only)
   */
  async kickPlayer(roomId, playerId) {
    const response = await api.post(`/rooms/${roomId}/kick`, { playerId });
    return response.data;
  },
  
  /**
   * Check if room exists
   */
  async checkRoom(roomCode) {
    const response = await api.get(`/rooms/check/${roomCode}`);
    return response.data;
  },
};

export default roomService;