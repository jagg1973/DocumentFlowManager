#!/bin/bash

# SEO Timeline Dashboard - Docker Setup Script

echo "🚀 Setting up SEO Timeline Dashboard with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=mysql://seo_user:seo_password@mysql:3306/seo_timeline
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
REDIS_URL=redis://redis:6379
PORT=5000
OPENAI_API_KEY=your-openai-api-key-here
EOF
    echo "✅ .env file created. Please update the SESSION_SECRET and OPENAI_API_KEY."
fi

# Create uploads directory
mkdir -p uploads

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo "🔍 Checking service status..."
docker-compose ps

# Check database connection
echo "🔌 Testing database connection..."
if docker-compose exec mysql mysql -u seo_user -pseo_password -e "SELECT 1;" seo_timeline &> /dev/null; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
fi

# Check application health
echo "🏥 Checking application health..."
sleep 5
if curl -f http://localhost:5000/api/health &> /dev/null; then
    echo "✅ Application is healthy"
    echo ""
    echo "🎉 Setup complete!"
    echo "📱 Application: http://localhost:5000"
    echo "🗄️  Database: localhost:3307"
    echo "🔑 Login: jaguzman123@hotmail.com"
    echo ""
    echo "📝 To stop services: docker-compose down"
    echo "📝 To view logs: docker-compose logs -f"
    echo "📝 To restart: docker-compose restart"
else
    echo "❌ Application health check failed"
    echo "📋 Check logs: docker-compose logs app"
fi