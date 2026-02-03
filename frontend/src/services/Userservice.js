import api from './api';

const userService = {
  /**
   * Get user profile by ID
   */
  async getUserById(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  /**
   * Get user stats
   */
  async getUserStats(userId) {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },
  
  /**
   * Get user game history
   */
  async getUserGames(userId, params = {}) {
    const response = await api.get(`/users/${userId}/games`, { params });
    return response.data;
  },
  
  /**
   * Update avatar
   */
  async updateAvatar(avatarUrl) {
    const response = await api.patch('/users/avatar', { avatarUrl });
    return response.data;
  },
  
  /**
   * Get leaderboard
   */
  async getLeaderboard(params = {}) {
    const response = await api.get('/leaderboard', { params });
    return response.data;
  },
  
  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard() {
    const response = await api.get('/leaderboard/weekly');
    return response.data;
  },
  
  /**
   * Get current user's rank
   */
  async getMyRank() {
    const response = await api.get('/leaderboard/me');
    return response.data;
  },
};

export default userService;