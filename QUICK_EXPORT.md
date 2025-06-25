# Quick Export: Essential Files for Local Development

Since zip download may not work, here are the critical files you need to copy manually:

## Core Files (Copy these first)

### 1. package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js --external:pg-native",
    "start": "node dist/server.js",
    "db:push": "drizzle-kit push"
  }
}
```

### 2. docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/seo_timeline
      - SESSION_SECRET=super-secret-session-key
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db

  db:
    image: postgres:15
    container_name: seo-timeline-db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=seo_timeline
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. local-setup.sh
```bash
#!/bin/bash
echo "Setting up SEO Timeline DMS locally..."

# Create .env file
cat > .env << EOL
DATABASE_URL=postgresql://postgres:password@localhost:5432/seo_timeline
SESSION_SECRET=super-secret-session-key-change-in-production
SENDGRID_API_KEY=your-sendgrid-api-key-here
NODE_ENV=development
PORT=5000
EOL

echo ".env file created"

# Install dependencies and start services
npm install
docker-compose up -d
sleep 10
npm run db:push

echo "Setup complete! Access app at http://localhost:5000"
```

## Directory Structure to Recreate

```
seo-timeline/
├── client/src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   └── main.tsx
├── server/
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   ├── auth.ts
│   └── db.ts
├── shared/
│   └── schema.ts
├── package.json
├── docker-compose.yml
└── local-setup.sh
```

## Most Critical Files for Debugging

1. **server/routes.ts** - Contains the projects API endpoint
2. **server/storage.ts** - Database query functions
3. **client/src/pages/Dashboard.tsx** - Frontend project display
4. **shared/schema.ts** - Database schema
5. **package.json** - Dependencies

## Manual File Copy Method

1. Open each file in Replit
2. Copy the contents
3. Paste into new files in your local environment
4. Maintain the same directory structure
5. Run `chmod +x local-setup.sh`
6. Execute `./local-setup.sh`

## Alternative: Git Clone Method

If you have git access, you could also:
1. Create a new git repository locally
2. Copy files in batches
3. Commit and push to git
4. Clone in your local environment

This method gives you the complete project structure needed to debug the frontend project display issue locally.