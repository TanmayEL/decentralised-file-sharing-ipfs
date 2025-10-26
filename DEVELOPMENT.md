# Development Guide

This guide will help you set up the project for local development.

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- Pinata account for IPFS pinning service
- Modern web browser

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd decentralised-file-sharing-ipfs
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**

   Backend (.env):
   ```bash
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/ipfs-files
   # For MongoDB Atlas: mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/ipfs-files?retryWrites=true&w=majority

   # Pinata IPFS Configuration
   PINATA_API_KEY=your_pinata_api_key
   PINATA_SECRET_KEY=your_pinata_secret_key

   # JWT Authentication
   JWT_SECRET=your_jwt_secret_key

   # Server Configuration
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

   Frontend (.env):
   ```bash
   # API Configuration
   REACT_APP_API_URL=http://localhost:5000
   ```

5. **Start MongoDB (if using local)**
   ```bash
   # For Windows
   mongod --dbpath C:\data\db
   
   # For macOS/Linux
   mongod --dbpath /data/db
   ```
   
   **OR use MongoDB Atlas**
   - Create free account at [mongodb.com/atlas](https://mongodb.com/atlas)
   - Create M0 Sandbox cluster
   - Get connection string and update MONGODB_URI

6. **Start the backend server**
   ```bash
   cd backend
   node index.js
   ```

7. **Start the frontend (new terminal)**
   ```bash
   cd frontend
   npm start
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Configuration Guide

### Pinata Setup
1. **Create Pinata Account**
   - Go to [pinata.cloud](https://pinata.cloud)
   - Sign up for free account
   - Verify your email

2. **Get API Credentials**
   - Go to "API Keys" in your dashboard
   - Create new API key
   - Copy API Key and Secret Key
   - Add to your `.env` file

3. **Free Tier Limits**
   - 1GB storage
   - 1GB bandwidth/month
   - 1,000 API calls/month

### MongoDB Atlas Setup
1. **Create Atlas Account**
   - Go to [mongodb.com/atlas](https://mongodb.com/atlas)
   - Sign up for free account

2. **Create Cluster**
   - Choose "FREE" tier (M0 Sandbox)
   - Select cloud provider and region
   - Name your cluster

3. **Database Access**
   - Create database user
   - Set username and password
   - Grant "Read and write to any database" privileges

4. **Network Access**
   - Add IP address (0.0.0.0/0 for all IPs)
   - Or add your specific IP address

5. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with your database user password
   - Add to your `.env` file
