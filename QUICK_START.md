# Quick XAMPP Setup

## 1. Extract Files
- Extract `seo_timeline_xampp.zip` to `C:\xampp\htdocs\seo_timeline`

## 2. Database Setup
- Start XAMPP (Apache + MySQL)
- Open phpMyAdmin: http://localhost/phpmyadmin
- Import `database_schema.sql`

## 3. Configure Environment
- Copy `.env.example` to `.env`
- Update database URL: `mysql://root:@localhost:3306/seo_timeline`

## 4. Install & Run
```bash
cd C:\xampp\htdocs\seo_timeline
npm install
npm run dev
```

## 5. Access Application
- Open: http://localhost:5000
- Login with: admin@example.com / admin123

## Debug Project Creation Issue
1. Open browser dev tools (F12)
2. Network tab
3. Create project
4. Check API responses:
   - POST /api/projects (should be 201)
   - GET /api/projects (should return projects)

## Manual Database Check
```sql
SELECT * FROM projects;
SELECT * FROM project_members;
```

The project creation issue is likely in the React Query cache invalidation. Check the browser console for errors.