# XAMPP Setup Guide for SEO Timeline Dashboard

## Prerequisites
- XAMPP with PHP 8.0+ and MySQL 5.7+
- Node.js 18+ installed
- Git (optional, for version control)

## 1. Download Project Files

You can download the entire project as a ZIP file from Replit or copy the files manually.

### Key Files to Copy:
```
/client/               # React frontend
/server/               # Node.js backend  
/shared/               # Shared TypeScript types
package.json           # Dependencies
package-lock.json      # Lock file
vite.config.ts         # Vite configuration
tailwind.config.ts     # Tailwind CSS config
tsconfig.json          # TypeScript config
drizzle.config.ts      # Database config
```

## 2. Database Setup (MySQL)

1. Start XAMPP and ensure MySQL is running
2. Open phpMyAdmin (http://localhost/phpmyadmin)
3. Create a new database called `seo_timeline`
4. Import the schema or run these commands:

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE,
  is_email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectName VARCHAR(255) NOT NULL,
  ownerId VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ownerId) REFERENCES users(id)
);

-- Project members table
CREATE TABLE project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  userId VARCHAR(255) NOT NULL,
  permissionLevel VARCHAR(50) DEFAULT 'view',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  projectId INT NOT NULL,
  taskName VARCHAR(255) NOT NULL,
  pillar VARCHAR(100) NOT NULL,
  phase VARCHAR(100) NOT NULL,
  description TEXT,
  assignedToId VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Not Started',
  progress INT DEFAULT 0,
  startDate DATE,
  endDate DATE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

-- Sessions table (for authentication)
CREATE TABLE sessions (
  sid VARCHAR(128) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP NOT NULL,
  INDEX IDX_session_expire (expire)
);
```

## 3. Environment Configuration

Create a `.env` file in the project root:

```env
NODE_ENV=development
DATABASE_URL=mysql://root:@localhost:3306/seo_timeline
SESSION_SECRET=your-super-secret-session-key-here
PORT=5000

# Optional AI features
OPENAI_API_KEY=your-openai-api-key-here
```

## 4. Install Dependencies

Open terminal in project root and run:

```bash
npm install
```

## 5. Database Migration

Run the database schema migration:

```bash
npm run db:push
```

## 6. Start Development Server

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5000
- Backend API: http://localhost:5000/api

## 7. Debugging the Project Creation Issue

To debug the project creation issue:

1. Open browser dev tools (F12)
2. Go to Network tab
3. Try creating a project
4. Check the API calls:
   - POST /api/projects should return 201
   - GET /api/projects should return your projects

### Common Issues:

1. **Authentication**: Make sure you're logged in
2. **Database**: Verify project_members table exists and has proper foreign keys
3. **Cache**: Clear browser cache and disable cache in dev tools
4. **Console Errors**: Check browser console for JavaScript errors

### Manual Database Check:

```sql
-- Check if projects are being created
SELECT * FROM projects ORDER BY id DESC LIMIT 5;

-- Check if project members are being added
SELECT * FROM project_members ORDER BY id DESC LIMIT 5;

-- Check user projects query
SELECT p.*, pm.permissionLevel 
FROM projects p 
LEFT JOIN project_members pm ON p.id = pm.projectId 
WHERE p.ownerId = 'your-user-id' OR pm.userId = 'your-user-id'
ORDER BY p.createdAt DESC;
```

## 8. Alternative: PHP Integration

If you want to integrate with existing PHP code, you can:

1. Keep the React frontend
2. Replace the Node.js backend with PHP endpoints
3. Use the same database schema
4. Implement the same API endpoints in PHP

Example PHP endpoint for creating projects:

```php
<?php
// api/projects.php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $projectName = $input['projectName'];
    $ownerId = $_SESSION['user_id']; // or however you handle auth
    
    $pdo = new PDO('mysql:host=localhost;dbname=seo_timeline', 'root', '');
    
    $stmt = $pdo->prepare("INSERT INTO projects (projectName, ownerId) VALUES (?, ?)");
    $stmt->execute([$projectName, $ownerId]);
    $projectId = $pdo->lastInsertId();
    
    // Add owner as project member
    $stmt = $pdo->prepare("INSERT INTO project_members (projectId, userId, permissionLevel) VALUES (?, ?, 'edit')");
    $stmt->execute([$projectId, $ownerId]);
    
    echo json_encode(['id' => $projectId, 'projectName' => $projectName, 'ownerId' => $ownerId]);
}
?>
```

## Troubleshooting

If you encounter issues:

1. Check XAMPP error logs
2. Verify Node.js and npm versions
3. Ensure all ports are available (5000 for app, 3306 for MySQL)
4. Check file permissions if on Linux/Mac