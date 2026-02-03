/**
 * Game Constants
 * Central configuration for game rules and scoring
 */
module.exports = {
    SCORING: {
        CORRECT_LETTER: 10,
        WRONG_GUESS: -5,
        SOLVE_WORD: 50,
        WORD_MASTER_WIN: 30,
        WORD_MASTER_LOSE: 10,
        HINT_COST: -15,
    },

    GAME: {
        MAX_INCORRECT_GUESSES: 6,
        TURN_TIME_SECONDS: 30,
        MIN_PLAYERS: 2,
        MAX_PLAYERS: 6,
        DEFAULT_ROUNDS: 5,
        MAX_HINTS: 3,
        DISCONNECT_GRACE_PERIOD_MS: 10000,
    },

    CATEGORIES: [
        'all',
        'movies',
        'animals',
        'technology',
        'sports',
        'food',
        'countries',
        'science',
    ],

    GAME_STATUS: {
        WORD_SELECTION: 'word-selection',
        IN_PROGRESS: 'in-progress',
        ROUND_END: 'round-end',
        GAME_OVER: 'game-over',
    },

    ROOM_STATUS: {
        WAITING: 'waiting',
        PLAYING: 'playing',
        FINISHED: 'finished',
    },
};
