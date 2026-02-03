# HangOut & Hangman 🎮

A real-time multiplayer Hangman game built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure access/refresh token system
- 🏠 **Game Rooms** - Create and join rooms with optional passwords
- 🎯 **Real-time Gameplay** - Live updates via Socket.IO
- 📊 **Leaderboards** - Global, weekly, and monthly rankings
- 💬 **In-game Chat** - Real-time messaging in rooms
- 💡 **Hint System** - Word masters can send hints
- 📁 **Categories** - Words from various themes

## Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: Socket.IO
- **Database**: MongoDB with Mongoose
- **Auth**: JWT (Access + Refresh tokens)
- **Security**: bcrypt, helmet, rate limiting

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gaurav1Nn/cautio.git
   cd cautio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

API documentation will be available at `/api/docs` after Phase 9.

## Project Status

🚧 **Under Development** - Building in phases

## License

MIT
