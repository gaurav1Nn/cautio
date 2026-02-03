# HangOut & Hangman 🎮

A real-time multiplayer Hangman game built with Node.js, Express, Socket.IO, MongoDB, and React.

## Project Structure

```
cautio/
├── backend/              # Node.js + Express + Socket.IO
│   ├── src/
│   │   ├── config/       # Database, Socket, Environment config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── socket/       # Socket.IO event handlers
│   │   └── utils/        # Helpers and constants
│   └── server.js
├── frontend/             # React + Vite
│   └── src/
│       ├── components/   # React components
│       ├── pages/        # Page components
│       └── services/     # API and Socket services
└── package.json          # Monorepo scripts
```

## Features

- 🔐 **JWT Authentication** - Access/refresh token system
- 🏠 **Game Rooms** - Create and join with optional passwords
- 🎯 **Real-time Gameplay** - Live updates via Socket.IO
- 📊 **Leaderboards** - Global, weekly, monthly rankings
- 💬 **In-game Chat** - Real-time messaging
- 💡 **Hint System** - Word masters can send hints
- 📁 **Categories** - Words from various themes

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB, Mongoose |
| Frontend | React, Vite |
| Auth | JWT (Access + Refresh) |
| Real-time | Socket.IO |

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)

### Installation

```bash
# Clone the repo
git clone https://github.com/gaurav1Nn/cautio.git
cd cautio

# Install all dependencies
npm run install:all

# Setup environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Or run separately
npm run dev:backend    # Backend on port 3000
npm run dev:frontend   # Frontend on port 5173
```

## API Documentation

Coming in Phase 9 (Swagger + Postman)

## Project Status

🚧 **Building in Phases** - See implementation plan for details

## License

MIT
