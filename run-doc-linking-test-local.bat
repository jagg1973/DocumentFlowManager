@echo off
echo Installing dependencies...
npm install axios form-data

echo Running document linking test from host...
node test-doc-linking.js
