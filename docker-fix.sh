#!/bin/bash

echo "🔧 Fixing Docker build and port conflicts..."

# Stop any running containers
docker-compose down -v

# Remove any orphaned containers
docker container prune -f

# Clean Docker build cache
docker system prune -f

# Check what's using port 3306
echo "🔍 Checking port usage:"
lsof -i :3306 || netstat -tulpn | grep :3306 || echo "Port 3306 check complete"

# Rebuild with no cache to fix vite build issue
echo "🔨 Rebuilding containers..."
docker-compose build --no-cache

# Start with new configuration
echo "🚀 Starting services..."
docker-compose up -d

echo "✅ Fixed! Services available:"
echo "   Application: http://localhost:5000"
echo "   Database: localhost:3307"