#!/bin/bash

echo "Testing Docker build locally..."

# Clean up first
echo "Cleaning up existing containers..."
docker-compose down -v 2>/dev/null || true
docker system prune -f 2>/dev/null || true

echo "Building containers..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "Build successful! Starting services..."
    docker-compose up -d
    
    echo "Waiting for services to start..."
    sleep 10
    
    echo "Testing application..."
    curl -f http://localhost:5000/api/health 2>/dev/null || echo "Health check endpoint not responding"
    
    echo "Services status:"
    docker-compose ps
    
    echo "Application available at: http://localhost:5000"
    echo "Database available at: localhost:3307"
else
    echo "Build failed. Check the output above for errors."
    exit 1
fi