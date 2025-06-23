#!/bin/bash

echo "🔧 Fixing Docker port conflicts..."

# Stop any running containers
docker-compose down -v

# Remove any orphaned containers
docker container prune -f

# Check what's using port 3306
echo "🔍 Checking port usage:"
lsof -i :3306 || netstat -tulpn | grep :3306 || echo "Port 3306 check complete"

# Start with new port configuration
echo "🚀 Starting with port 3307..."
docker-compose up -d

echo "✅ Fixed! Database now available on localhost:3307"