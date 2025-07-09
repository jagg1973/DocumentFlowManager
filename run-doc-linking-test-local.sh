#!/bin/bash

# Install dependencies if they don't exist
if [ ! -d "node_modules" ] || [ ! -f "node_modules/axios/package.json" ]; then
  echo "Installing dependencies..."
  npm install axios form-data
fi

# Run test externally (accessing Docker through localhost)
echo "Running document linking test from host..."
node test-doc-linking.js
