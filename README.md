# TrackFlow ERP

TrackFlow is a premium enterprise ERP application featuring JWT-based authentication, audit logging, a dynamic user creation panel, and role-based placeholder modules.

---

## Technical Stack

* **Frontend**: React, React Router 7, Zustand, TailwindCSS, Axios
* **Backend**: Node.js, Express, Sequelize ORM
* **Database**: MySQL 8.x

---

## Getting Started

Follow these steps to configure and run the application locally.

### 1. Database Setup (MySQL)

If you do not want to run or start the global MySQL service, you can run a local MySQL instance writing data directly to the workspace:

1. **Initialize the local database folder** (Run once):
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --initialize-insecure --datadir="mysql_data"
   ```
2. **Start the MySQL server** on port 3306:
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="mysql_data" --port=3306
   ```
3. **Set the root password & create database** (Run once server is running):
   ```powershell
   mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'Sree@5678'; FLUSH PRIVILEGES;"
   mysql -u root -p"Sree@5678" -e "CREATE DATABASE IF NOT EXISTS erp_db;"
   ```

*(Note: If you already have a global MySQL instance running, simply ensure the database `erp_db` is created and your credentials match the backend `.env` configuration).*

---

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your `.env` configuration file:
   - Copy `.env.example` as `.env` and configure your database variables:
     ```env
     PORT=3000
     DB_HOST=localhost
     DB_PORT=3306
     DB_NAME=erp_db
     DB_USER=root
     DB_PASSWORD=Sree@5678
     JWT_ACCESS_SECRET=your_access_secret_key
     JWT_REFRESH_SECRET=your_refresh_secret_key
     ```
4. Start the server (includes automatic Sequelize database syncing and role seeding):
   ```bash
   npm run dev   # Runs server with nodemon
   # Or run directly:
   node server.js
   ```

---

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server (configured to proxy `/api` requests to port 3000):
   ```bash
   npm run dev
   ```

---

## Default Credentials

The database is pre-seeded with two accounts on server startup:

* **Administrator**:
  - **Login ID**: `admin`
  - **Password**: `admin123`
* **Sales Manager**:
  - **Login ID**: `sm_sree`
  - **Password**: `password123`
