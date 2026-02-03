import api from './api';

const gameService = {
  /**
   * Start a game in a room
   */
  async startGame(roomId) {
    const response = await api.post(`/games/start`, { roomId });
    return response.data;
  },
  
  /**
   * Get current game state
   */
  async getGameState(gameId) {
    const response = await api.get(`/games/${gameId}`);
    return response.data;
  },
  
  /**
   * Submit a word (Word Master)
   */
  async submitWord(gameId, word, hint = null) {
    const response = await api.post(`/games/${gameId}/word`, { word, hint });
    return response.data;
  },
  
  /**
   * Get a random word from category
   */
  async getRandomWord(category = 'all') {
    const response = await api.get('/games/random-word', { params: { category } });
    return response.data;
  },
  
  /**
   * Validate a word using dictionary API
   */
  async validateWord(word) {
    const response = await api.get('/games/validate-word', { params: { word } });
    return response.data;
  },
  
  /**
   * Get game history for current user
   */
  async getGameHistory(params = {}) {
    const response = await api.get('/games/history', { params });
    return response.data;
  },
};

export default gameService;