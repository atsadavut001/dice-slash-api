# Dice Slash - API Server

This is the backend API server for the **Dice Slash** project, powering the game logic, user authentication, matchmaking, and database interactions.

## 🚀 Technologies

- **NestJS**: A progressive Node.js framework for building scalable and maintainable backend applications.
- **TypeScript**: Static typing for safer code.
- **TypeORM**: Object-Relational Mapper for Postgres database integration.
- **PostgreSQL / Supabase**: Primary database and realtime engine.
- **Passport & JWT**: Secure authentication and Google OAuth.
- **RxJS**: Reactive programming used extensively in NestJS architecture.

## 📁 Project Structure

- `src/database/`: TypeORM entities (`User`, `Match`, `Card`, `Deck`).
- `src/modules/`: Feature-based modules.
  - `auth/`: JWT strategies and login endpoints.
  - `users/`: User profile management and match history.
  - `shop/`: Card collection and gacha mechanics.
  - `deck/`: Deck building API endpoints.
  - `game/`: The core Game Engine and Matchmaking REST APIs.
- `src/common/`: Shared guards, interceptors, and decorators.

## 🎮 Core Mechanics

- **RESTful Game Engine**: The entire game is fully RESTful, saving match state as JSONB in Postgres.
- **Supabase Realtime**: Clients listen to changes in the Postgres `Match` table rather than using WebSockets, reducing backend load.
- **Turn Timer Validation**: Implements lazy evaluation checks for the 90-second turn limit when clients submit moves.
- **Rock-Paper-Scissors (RPS)**: A specialized pre-game phase to determine turn order.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database (or Supabase local environment)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup environment variables (create a `.env` file):
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/diceslash
   JWT_SECRET=super-secret-dice-key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_key
   ```

3. Run the development server:
   ```bash
   npm run start:dev
   ```

## 📜 Scripts

- `npm run start:dev`: Starts the NestJS application in watch mode.
- `npm run build`: Compiles the application to the `dist` folder.
- `npm run test`: Runs unit tests, specifically for the complex Game Engine.
- `npm run test:e2e`: Runs end-to-end tests.
