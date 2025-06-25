#!/bin/bash

# Local Development Setup Script for SEO Timeline DMS
# Run this script in your local environment after extracting the project files

echo "🚀 Setting up SEO Timeline DMS locally..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/seo_timeline

# Session Secret (generate a secure one)
SESSION_SECRET=super-secret-session-key-change-in-production

# Email Configuration (add your SendGrid API key)
SENDGRID_API_KEY=your-sendgrid-api-key-here

# Development Settings
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:5000

# Docker Database Settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=seo_timeline
EOL
    echo "✅ .env file created. Please update SENDGRID_API_KEY with your actual key."
else
    echo "✅ .env file already exists"
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose down 2>/dev/null
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Setting up database schema..."
npm run db:push

echo "✅ Setup complete!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:5000"
echo "   Backend API: http://localhost:5000/api"
echo ""
echo "🗄️  Database Connection:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: seo_timeline"
echo "   Username: postgres"
echo "   Password: password"
echo ""
echo "📋 Next Steps:"
echo "1. Update SENDGRID_API_KEY in .env file"
echo "2. Import your data using import-data.sql (optional)"
echo "3. Start development: npm run dev"
echo "4. Access application at http://localhost:5000"
echo ""
echo "🐛 Debug Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Database access: docker exec -it seo-timeline-db psql -U postgres -d seo_timeline"
echo "   Restart services: docker-compose restart"