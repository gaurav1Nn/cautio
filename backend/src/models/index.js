/**
 * Models Index
 * Export all models from a single entry point
 */
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const Room = require('./Room');
const Game = require('./Game');
const Leaderboard = require('./Leaderboard');

module.exports = {
    User,
    RefreshToken,
    Room,
    Game,
    Leaderboard,
};
