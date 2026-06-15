# TrackFlow

TrackFlow is a full-stack application built with React, TailwindCSS, Express, Prisma, and PostgreSQL.

## Getting Started

This repository is split into two main components:
- `client/` - The React Frontend
- `server/` - The Express & Prisma Backend

### Prerequisites

You need to have the following installed:
- Node.js
- PostgreSQL running locally on port `5432`

---

### Backend Setup (Server)

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables:
   - Copy the example `.env` file to create your own:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and replace `POSTGRES_USER` and `POSTGRES_PASSWORD` with your actual local PostgreSQL credentials.

4. Initialize the Database:
   This will automatically create the `trackflow` database (if it doesn't exist) and apply all the tables/schemas to it:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:3001`

---

### Frontend Setup (Client)

1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will run on a local port (usually `http://localhost:5173`) and connect to the backend automatically.
