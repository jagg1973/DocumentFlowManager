# Debug Guide: Frontend Project Display Issues

## Current Problem
- Projects are created successfully (backend logs confirm)
- Database contains projects (SQL queries confirm)
- Frontend queries fail with empty responses ("Projects query failed: {}")
- Authentication working (user session active)

## Local Debugging Steps

### 1. API Endpoint Testing

Test the projects endpoint directly:
```bash
# Get session cookie from browser DevTools
curl -v http://localhost:5000/api/projects \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE_HERE" \
  -H "Content-Type: application/json"
```

Expected response:
```json
[
  {
    "id": 53,
    "projectName": "Speed",
    "name": "Speed",
    "ownerId": "4f6c9cf4-732e-4192-941f-db989ef2d5e1",
    "totalTasks": 0,
    "completedTasks": 0,
    "averageProgress": 0,
    "status": "active",
    "priority": "medium",
    "pillar": "Technical SEO",
    "phase": "Foundation"
  }
]
```

### 2. Frontend Network Inspection

Open browser DevTools → Network tab:
1. Filter by "projects"
2. Reload page or navigate to Dashboard
3. Check the `/api/projects` request:
   - Status code (should be 200)
   - Request headers (authentication)
   - Response body (should contain project data)
   - Response headers

### 3. Console Logging

Add debug logs to `client/src/pages/Dashboard.tsx`:
```typescript
const { data: projects = [], isLoading, error } = useQuery<ProjectWithStats[]>({
  queryKey: ["/api/projects"],
  enabled: !!user,
  onSuccess: (data) => {
    console.log("✅ Projects loaded:", data);
    console.log("Project count:", data?.length);
    console.log("Raw data:", JSON.stringify(data, null, 2));
  },
  onError: (error) => {
    console.error("❌ Projects query failed:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
  }
});

// Add this after the query
console.log("Query state:", { projects, isLoading, error });
```

### 4. Backend Response Logging

Add logs to `server/routes.ts` in the projects endpoint:
```typescript
app.get("/api/projects", async (req: any, res: any) => {
  // ... existing auth check ...
  
  try {
    console.log("🔍 Fetching projects for user:", req.session.userId);
    const projects = await storage.getProjectsForUser(req.session.userId);
    console.log("📊 Raw projects from storage:", projects.length, projects);
    
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // ... existing mapping ...
        console.log("🔄 Processing project:", project.id, project.projectName);
        return mappedProject;
      })
    );
    
    console.log("📤 Final response:", JSON.stringify(projectsWithStats, null, 2));
    res.json(projectsWithStats);
  } catch (error) {
    console.error("💥 Error in projects endpoint:", error);
    res.status(500).json({ message: "Failed to fetch projects", error: error.message });
  }
});
```

### 5. Database Query Verification

Test the storage function directly:
```sql
-- In PostgreSQL, run this query to verify data exists:
SELECT 
    p.*,
    pm.user_id as member_user_id,
    pm.permission_level
FROM dms_projects p
LEFT JOIN dms_project_members pm ON p.id = pm.project_id
WHERE p.owner_id = '4f6c9cf4-732e-4192-941f-db989ef2d5e1'
ORDER BY p.created_at DESC;
```

### 6. Session Debugging

Check session state:
```typescript
// In any authenticated component
console.log("Session user:", user);
console.log("User ID:", user?.id);
console.log("Auth state:", !!user);
```

Backend session check:
```typescript
// Add to routes.ts
app.get("/api/debug/session", (req: any, res: any) => {
  console.log("Session data:", req.session);
  res.json({
    sessionExists: !!req.session,
    userId: req.session?.userId,
    sessionId: req.sessionID
  });
});
```

### 7. React Query State

Check if React Query is properly configured:
```typescript
// In Dashboard.tsx, add this useEffect
useEffect(() => {
  console.log("React Query state:", {
    projects: projects?.length,
    isLoading,
    error: error?.message,
    user: !!user
  });
}, [projects, isLoading, error, user]);
```

## Common Issues & Solutions

### Issue 1: Empty Response Body
**Symptom:** Network tab shows 200 status but empty `[]` response
**Solution:** Check `server/storage.ts` `getProjectsForUser` function

### Issue 2: 401 Unauthorized
**Symptom:** Projects endpoint returns 401
**Solution:** Session not properly set, check authentication flow

### Issue 3: CORS Issues
**Symptom:** Network errors, blocked requests
**Solution:** Ensure frontend/backend on same port (5000)

### Issue 4: Field Mapping Issues
**Symptom:** Data exists but frontend doesn't recognize it
**Solution:** Verify `projectName` → `name` mapping in routes

### Issue 5: React Query Cache
**Symptom:** Old data stuck in cache
**Solution:** Clear cache or disable caching during debug

## Expected Working Flow

1. User loads Dashboard
2. `useQuery` triggers request to `/api/projects`
3. Backend authenticates user via session
4. `storage.getProjectsForUser()` queries database
5. Projects mapped with stats and field names
6. Response sent as JSON array
7. Frontend receives data and renders projects

## Quick Fixes to Try

1. **Clear browser cache** and hard refresh
2. **Restart Docker services** `docker-compose restart`
3. **Re-run database migrations** `npm run db:push`
4. **Check environment variables** in `.env`
5. **Verify database connection** with direct query

The local environment will allow you to see exact error messages and debug each step of this flow.