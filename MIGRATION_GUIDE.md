# Migration Guide: SEO Timeline DMS to Local Docker Environment

## Current Status
- Projects are being created successfully (IDs 53, 54 just created)
- Database contains 12+ projects for user `4f6c9cf4-732e-4192-941f-db989ef2d5e1`
- Backend API working correctly (project creation, authentication)
- Frontend failing to fetch/display projects ("Projects query failed" errors)
- Email system fully configured with SendGrid

## Quick Migration Steps

### 1. Download All Project Files
Download the entire project directory structure:

```
/home/runner/workspace/
├── client/                 # React frontend
├── server/                 # Express backend
├── shared/                 # Shared types/schemas
├── package.json           # Dependencies
├── docker-compose.yml     # Docker configuration
├── Dockerfile            # Production container
├── Dockerfile.dev        # Development container
└── All configuration files
```

### 2. Local Environment Setup

Create `.env` file in project root:
```env
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/seo_timeline

# Session Secret
SESSION_SECRET=your-super-secret-key-here

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key

# Development Settings
NODE_ENV=development
PORT=5000
```

### 3. Docker Setup Commands

```bash
# Build and start all services
docker-compose up --build

# Or for development with hot reload
docker-compose -f docker-compose.yml up --build

# Database only (if you prefer local Node.js)
docker run -d \
  --name postgres-seo \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=seo_timeline \
  -p 5432:5432 \
  postgres:15
```

### 4. Database Migration

The database schema is already defined in `shared/schema.ts`. Run migrations:

```bash
# Install dependencies
npm install

# Push schema to database
npm run db:push

# Or manual schema creation
psql -U postgres -d seo_timeline -f database_schema.sql
```

### 5. Import Existing Data

Export current data from Replit database:
```sql
-- Export projects
COPY (SELECT * FROM dms_projects) TO '/tmp/projects.csv' WITH CSV HEADER;

-- Export users
COPY (SELECT * FROM dms_users) TO '/tmp/users.csv' WITH CSV HEADER;

-- Export project members
COPY (SELECT * FROM dms_project_members) TO '/tmp/project_members.csv' WITH CSV HEADER;

-- Export documents
COPY (SELECT * FROM dms_documents) TO '/tmp/documents.csv' WITH CSV HEADER;

-- Export tasks
COPY (SELECT * FROM dms_tasks) TO '/tmp/tasks.csv' WITH CSV HEADER;
```

Import to local database:
```sql
-- Import projects
COPY dms_projects FROM '/path/to/projects.csv' WITH CSV HEADER;

-- Import users  
COPY dms_users FROM '/path/to/users.csv' WITH CSV HEADER;

-- Import project members
COPY dms_project_members FROM '/path/to/project_members.csv' WITH CSV HEADER;

-- Continue for other tables...
```

## Current Issue Debugging

### Problem: Frontend Projects Query Failing

**Root Cause Analysis:**
1. Backend successfully creates projects (confirmed via logs)
2. Database contains projects (confirmed via SQL queries)
3. Frontend authentication working (user session active)
4. API endpoint `/api/projects` exists and responds
5. Frontend making requests but getting empty responses

**Debugging Steps for Local Environment:**

1. **Check API Response:**
```bash
# Test project endpoint directly
curl -v http://localhost:5000/api/projects \
  -H "Cookie: connect.sid=your-session-cookie"

# Check if projects exist in database
docker exec -it postgres-seo psql -U postgres -d seo_timeline \
  -c "SELECT id, project_name, owner_id FROM dms_projects ORDER BY created_at DESC LIMIT 10;"
```

2. **Frontend Network Tab:**
- Open browser DevTools → Network
- Filter by "projects" 
- Check request/response details
- Verify authentication headers

3. **Backend Logs:**
```bash
# Enable detailed logging in server/routes.ts
console.log("Raw database result:", projects);
console.log("Enhanced projects:", projectsWithStats);
console.log("Final response:", JSON.stringify(projectsWithStats, null, 2));
```

4. **Database Connection:**
```bash
# Verify database connection
docker exec -it postgres-seo psql -U postgres -d seo_timeline -c "\dt"
```

## Key Files to Check Locally

### Critical Components:
1. `server/routes.ts` - API endpoints (lines 42-80)
2. `server/storage.ts` - Database queries (lines 285-317)
3. `client/src/pages/Dashboard.tsx` - Frontend project fetching
4. `client/src/lib/queryClient.ts` - API request configuration
5. `shared/schema.ts` - Database schema definitions

### Environment Variables:
```env
# Required for functionality
DATABASE_URL=postgresql://user:pass@host:port/db
SESSION_SECRET=random-secret-key
SENDGRID_API_KEY=sg.your-api-key

# Optional for development
DEBUG=true
VITE_API_URL=http://localhost:5000
```

## Expected Fixes in Local Environment

1. **Better Error Visibility:** Local logs will show exact error details
2. **Database Access:** Direct PostgreSQL access for debugging queries  
3. **Network Debugging:** Full control over request/response inspection
4. **Hot Reload:** Faster iteration for fixes

## Migration Checklist

- [ ] Download all project files
- [ ] Set up local Docker environment
- [ ] Configure environment variables
- [ ] Run database migrations
- [ ] Import existing data (optional)
- [ ] Test API endpoints directly
- [ ] Debug frontend query issues
- [ ] Verify authentication flow
- [ ] Test project creation/retrieval

## Support Files Included

- `docker-compose.yml` - Multi-service setup
- `Dockerfile` - Production container
- `package.json` - All dependencies
- `database_schema.sql` - Complete schema
- `DOCKER_README.md` - Docker-specific instructions

The local environment will give you full debugging capabilities to resolve the frontend project display issue that's currently preventing proper functionality.