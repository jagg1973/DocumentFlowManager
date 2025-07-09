# SEO Timeline Dashboard - Setup Instructions

## Quick Setup Guide

The SEO Timeline Dashboard is ready to run. Follow these steps to get it started:

### Prerequisites
- Docker and Docker Compose installed
- Or Node.js 18+ and PostgreSQL for local development

### Option 1: Docker Setup (Recommended)
```bash
# Clone or extract the project
cd DocumentFlowManager

# Start the application with Docker
docker-compose up --build -d

# The application will be available at:
# http://localhost:5000
```

### Option 2: Local Development Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database configuration

# Start the development server
npm run dev
```

### Environment Variables
Create a `.env` file with:
```env
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=your-secure-session-secret
NODE_ENV=development
```

### Database Setup
The application will automatically create the required tables on first run.

### Default Admin Access
Admin access is granted to: `jaguzman123@hotmail.com`

### Support
Check the other documentation files for detailed integration and migration guides.
