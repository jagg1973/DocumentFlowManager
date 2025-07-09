#!/bin/bash

# Install dependencies if they don't exist
if [ ! -d "node_modules" ] || [ ! -f "node_modules/axios/package.json" ]; then
  echo "Installing dependencies..."
  npm install axios form-data
fi

# Run test inside Docker container
echo "Running document linking test inside Docker container..."
docker-compose exec -e DOCKER_ENV=true app node test-doc-linking.js
