# SEO Timeline Dashboard - Docker Setup

Complete Docker implementation for the SEO Timeline Dashboard with MySQL 8.0, Redis, and modern Node.js.

## 🚀 Quick Start

1. **Prerequisites**
   ```bash
   # Install Docker and Docker Compose
   # Windows/Mac: Download Docker Desktop
   # Linux: Install docker and docker-compose packages
   ```

2. **Setup and Run**
   ```bash
   # Make setup script executable
   chmod +x docker-setup.sh
   
   # Run automated setup
   ./docker-setup.sh
   ```

3. **Access Application**
   - **Application**: http://localhost:5000
   - **Database**: localhost:3307 (user: `seo_user`, password: `seo_password`)
   - **Default Login**: jaguzman123@hotmail.com

## 📋 Manual Setup

### 1. Environment Configuration
```bash
# Copy and edit environment variables
cp .env.example .env
# Update SESSION_SECRET and OPENAI_API_KEY in .env
```

### 2. Start Services
```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app
```

### 3. Database Access
```bash
# Connect to MySQL
docker-compose exec mysql mysql -u seo_user -pseo_password seo_timeline

# Run database migrations (if needed)
docker-compose exec app npm run db:push
```

## 🛠️ Development Mode

For development with hot reload:

```bash
# Use development compose file
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or modify docker-compose.yml and uncomment app-dev service
```

## 📊 Services

| Service | Port | Description |
|---------|------|-------------|
| app | 5000 | Main application (Node.js + React) |
| mysql | 3307 | MySQL 8.0 database |
| redis | 6379 | Redis for session storage |

## 🐛 Debugging Project Creation Issue

The project creation issue can be debugged more easily with Docker:

1. **Check API Responses**
   ```bash
   # View application logs
   docker-compose logs -f app
   
   # Test API directly
   curl -X POST http://localhost:5000/api/projects \
        -H "Content-Type: application/json" \
        -d '{"projectName":"Test Project"}'
   ```

2. **Database Verification**
   ```bash
   # Connect to database
   docker-compose exec mysql mysql -u seo_user -pseo_password seo_timeline
   
   # Check projects table
   SELECT * FROM projects ORDER BY id DESC LIMIT 5;
   
   # Check project members
   SELECT * FROM project_members ORDER BY id DESC LIMIT 5;
   ```

3. **Frontend Debugging**
   - Open browser dev tools (F12)
   - Network tab to see API calls
   - Console tab for JavaScript errors
   - Check React Query cache in browser extensions

## 🔧 Common Commands

```bash
# Stop all services
docker-compose down

# Restart application only
docker-compose restart app

# Rebuild application
docker-compose build app
docker-compose up -d app

# Clean restart (removes volumes)
docker-compose down -v
docker-compose up -d

# View live logs
docker-compose logs -f

# Execute commands in containers
docker-compose exec app npm run db:push
docker-compose exec mysql mysql -u root -p
```

## 🗂️ File Structure

```
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Main compose configuration
├── docker-setup.sh         # Automated setup script
├── database_schema.sql     # MySQL database schema
├── .dockerignore           # Docker ignore patterns
└── .env                    # Environment variables
```

## 🔍 Troubleshooting

### Database Connection Issues
```bash
# Check MySQL logs
docker-compose logs mysql

# Verify network connectivity
docker-compose exec app ping mysql
```

### Application Won't Start
```bash
# Check application logs
docker-compose logs app

# Rebuild and restart
docker-compose build app
docker-compose up -d app
```

### Port Conflicts
```bash
# Change ports in docker-compose.yml
# Example: Change "5000:5000" to "5001:5000"
```

### Permission Issues (Linux)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x docker-setup.sh
```

## 🔒 Security Notes

- Change `SESSION_SECRET` in production
- Use strong database passwords
- Configure firewall rules for production
- Enable SSL/TLS for production deployment
- Regular database backups

## 📈 Performance Optimization

- Use Redis for session storage (included)
- Configure MySQL query cache
- Enable Docker layer caching
- Use multi-stage builds (implemented)
- Monitor container resources with `docker stats`

This Docker setup provides a robust, scalable environment that matches modern production standards and should resolve the project creation UI refresh issues through proper container isolation and networking.