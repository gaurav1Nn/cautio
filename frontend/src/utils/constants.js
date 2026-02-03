export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  GAME: '/game/:roomId',
  WORD_MASTER: '/game/:roomId/wordmaster',
  RESULTS: '/game/:roomId/results',
  PROFILE: '/profile',
  USER_PROFILE: '/profile/:userId',
  LEADERBOARD: '/leaderboard',
};

export const GAME_CONFIG = {
  MAX_INCORRECT_GUESSES: 6,
  TURN_TIME_SECONDS: 30,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  DEFAULT_ROUNDS: 5,
  WORD_MIN_LENGTH: 3,
  WORD_MAX_LENGTH: 15,
};

export const SCORING = {
  CORRECT_LETTER: 10,
  WRONG_GUESS: -5,
  SOLVE_WORD: 50,
  WORD_MASTER_WIN: 30,
  WORD_MASTER_LOSE: 10,
  HINT_COST: -15,
};

export const CATEGORIES = [
  { id: 'all', label: 'Random', icon: '🎲' },
  { id: 'animals', label: 'Animals', icon: '🦁' },
  { id: 'movies', label: 'Movies', icon: '🎬' },
  { id: 'food', label: 'Food', icon: '🍕' },
  { id: 'technology', label: 'Tech', icon: '💻' },
  { id: 'sports', label: 'Sports', icon: '⚽' },
  { id: 'countries', label: 'Countries', icon: '🌍' },
  { id: 'science', label: 'Science', icon: '🔬' },
];

export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

export const GAME_STATUS = {
  WORD_SELECTION: 'word-selection',
  IN_PROGRESS: 'in-progress',
  ROUND_END: 'round-end',
  GAME_OVER: 'game-over',
};

export const PLAYER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  DISCONNECTED: 'disconnected',
};

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_PLAYER_JOINED: 'room:player-joined',
  ROOM_PLAYER_LEFT: 'room:player-left',
  ROOM_SETTINGS_UPDATED: 'room:settings-updated',
  ROOM_HOST_CHANGED: 'room:host-changed',
  
  // Game events
  GAME_START: 'game:start',
  GAME_WORD_SELECTION: 'game:word-selection',
  GAME_WORD_SET: 'game:word-set',
  GAME_GUESS: 'game:guess',
  GAME_LETTER_RESULT: 'game:letter-result',
  GAME_WORD_UPDATE: 'game:word-update',
  GAME_TURN_CHANGE: 'game:turn-change',
  GAME_TIMER_TICK: 'game:timer-tick',
  GAME_HINT: 'game:hint',
  GAME_SEND_HINT: 'game:send-hint',
  GAME_ROUND_END: 'game:round-end',
  GAME_END: 'game:end',
  GAME_SCORES: 'game:scores',
  GAME_PLAYER_DISCONNECTED: 'game:player-disconnected',
  GAME_PLAYER_RECONNECTED: 'game:player-reconnected',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_BROADCAST: 'chat:broadcast',
  CHAT_SYSTEM: 'chat:system',
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'hangout_access_token',
  USER: 'hangout_user',
  THEME: 'hangout_theme',
};

export const DEFAULT_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
];

export const BADGES = [
  { id: 'quick_thinker', name: 'Quick Thinker', icon: '⚡', description: 'Guess correctly in under 5 seconds' },
  { id: 'word_smith', name: 'Word Smith', icon: '📝', description: 'Win 10 games as Word Master' },
  { id: 'risk_taker', name: 'Risk Taker', icon: '🎯', description: 'Win a game with only 1 life remaining' },
  { id: 'early_bird', name: 'Early Bird', icon: '🌅', description: 'Play a game before 8 AM' },
  { id: 'night_owl', name: 'Night Owl', icon: '🦉', description: 'Play a game after midnight' },
  { id: 'social_butterfly', name: 'Social Butterfly', icon: '🦋', description: 'Play with 10 different players' },
  { id: 'streak_master', name: 'Streak Master', icon: '🔥', description: 'Win 5 games in a row' },
  { id: 'vocabulary_king', name: 'Vocabulary King', icon: '👑', description: 'Guess 100 words correctly' },
];