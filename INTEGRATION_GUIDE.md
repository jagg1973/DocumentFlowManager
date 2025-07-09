# SEO Project Timeline Dashboard - Integration Guide

## Overview

This premium SEO Project Timeline Dashboard has been built as a production-ready, self-contained module using modern React and Node.js technologies. This guide provides detailed instructions for integrating this dashboard with your existing PHP-based Document Management System (DMS).

## Architecture Summary

### Technology Stack
- **Frontend**: React 18 with TypeScript, Tailwind CSS with liquid glass effects
- **Backend**: Node.js with Express.js and TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: SAAS Authentication (Email/Password) - easily replaceable with your auth system
- **UI Framework**: Shadcn/ui components with custom glassmorphism styling

### Database Schema

The dashboard uses the following tables that align with your specifications:

```sql
-- Projects table
CREATE TABLE dms_projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    owner_id VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Multi-tenant project members
CREATE TABLE dms_project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES dms_projects(id),
    user_id VARCHAR NOT NULL,
    permission_level permission_level DEFAULT 'view'
);

-- SEO tasks with framework integration
CREATE TABLE dms_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES dms_projects(id),
    task_name VARCHAR(255) NOT NULL,
    assigned_to_id VARCHAR,
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    pillar pillar, -- 'Technical', 'On-Page & Content', 'Off-Page', 'Analytics'
    phase phase,   -- '1: Foundation', '2: Growth', '3: Authority'
    guideline_doc_link VARCHAR(255), -- Links to your DMS documents
    status status DEFAULT 'Not Started',
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Session storage for authentication
CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);
```

## Integration Options

### Option 1: Embedded Module (Recommended)

Integrate the dashboard as an iframe or embedded component within your existing PHP application.

#### Step 1: Deploy the Dashboard
1. Deploy the Node.js application to your server or cloud platform
2. Configure environment variables:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   SESSION_SECRET=your-session-secret
   ```

#### Step 2: Database Integration
```sql
-- Create the required tables in your existing database
-- Use the schema provided above

-- If you need to link to existing user tables:
ALTER TABLE dms_project_members 
ADD CONSTRAINT fk_user_id 
FOREIGN KEY (user_id) REFERENCES your_users_table(id);
```

#### Step 3: Authentication Bridge
Create a PHP bridge to handle authentication between your DMS and the dashboard:

```php
<?php
// auth_bridge.php
session_start();

// Verify user is logged into your DMS
if (!isset($_SESSION['user_id'])) {
    header('Location: /login');
    exit;
}

// Generate a secure token for the dashboard
$token = bin2hex(random_bytes(32));
$_SESSION['dashboard_token'] = $token;

// Store user info for dashboard access
$user_data = [
    'id' => $_SESSION['user_id'],
    'email' => $_SESSION['user_email'],
    'firstName' => $_SESSION['user_first_name'],
    'lastName' => $_SESSION['user_last_name'],
    'profileImageUrl' => $_SESSION['user_avatar']
];

// Embed dashboard with authentication
echo '<iframe src="https://your-dashboard.com/?token=' . $token . '" 
           width="100%" height="800px" frameborder="0"></iframe>';
?>
```

#### Step 4: Document Linking
Integrate with your existing DMS by updating the `guideline_doc_link` field:

```php
// In your DMS, when creating/editing tasks
$guideline_link = "https://your-dms.com/documents/view/" . $document_id;

// Update task via API
$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => "https://your-dashboard.com/api/tasks/{$task_id}",
    CURLOPT_CUSTOMREQUEST => "PUT",
    CURLOPT_POSTFIELDS => json_encode([
        'guidelineDocLink' => $guideline_link
    ]),
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Authorization: Bearer " . $auth_token
    ]
]);
```

### Option 2: API Integration

Use the dashboard's REST API to integrate SEO project data with your existing PHP application.

#### API Endpoints

```javascript
// Projects
GET    /api/projects                    // List user projects
POST   /api/projects                    // Create project
GET    /api/projects/:id                // Get project details
PUT    /api/projects/:id                // Update project
DELETE /api/projects/:id                // Delete project

// Tasks
GET    /api/projects/:id/tasks          // List project tasks
POST   /api/projects/:id/tasks          // Create task
PUT    /api/tasks/:id                   // Update task
DELETE /api/tasks/:id                   // Delete task

// Members
GET    /api/projects/:id/members        // List project members
POST   /api/projects/:id/members        // Add member
PUT    /api/projects/:id/members/:id    // Update member permissions
DELETE /api/projects/:id/members/:id    // Remove member

// Export
GET    /api/projects/:id/export         // Export to Excel
```

#### PHP Integration Example

```php
<?php
class SEODashboardAPI {
    private $base_url;
    private $auth_token;
    
    public function __construct($base_url, $auth_token) {
        $this->base_url = rtrim($base_url, '/');
        $this->auth_token = $auth_token;
    }
    
    public function createProject($name, $owner_id) {
        return $this->request('POST', '/api/projects', [
            'projectName' => $name,
            'ownerId' => $owner_id
        ]);
    }
    
    public function createTask($project_id, $task_data) {
        return $this->request('POST', "/api/projects/{$project_id}/tasks", $task_data);
    }
    
    public function exportProject($project_id) {
        $response = $this->request('GET', "/api/projects/{$project_id}/export", null, true);
        
        // Save Excel file
        file_put_contents("seo_export_{$project_id}.xlsx", $response);
        return "seo_export_{$project_id}.xlsx";
    }
    
    private function request($method, $endpoint, $data = null, $binary = false) {
        $curl = curl_init();
        $url = $this->base_url . $endpoint;
        
        $options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$this->auth_token}",
                "Content-Type: application/json"
            ]
        ];
        
        if ($data && in_array($method, ['POST', 'PUT', 'PATCH'])) {
            $options[CURLOPT_POSTFIELDS] = json_encode($data);
        }
        
        if ($binary) {
            $options[CURLOPT_BINARYTRANSFER] = true;
        }
        
        curl_setopt_array($curl, $options);
        $response = curl_exec($curl);
        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
        
        if ($binary) {
            return $response;
        }
        
        return json_decode($response, true);
    }
}

// Usage example
$api = new SEODashboardAPI('https://your-dashboard.com', $auth_token);

// Create a new SEO project
$project = $api->createProject('Website Redesign SEO', $user_id);

// Add tasks based on SEO Masterplan
$tasks = [
    [
        'taskName' => 'Technical SEO Audit',
        'pillar' => 'Technical',
        'phase' => '1: Foundation',
        'assignedToId' => $seo_specialist_id,
        'startDate' => '2025-01-01',
        'endDate' => '2025-01-15',
        'description' => 'Comprehensive technical analysis of current website'
    ],
    [
        'taskName' => 'Keyword Research & Strategy',
        'pillar' => 'On-Page & Content',
        'phase' => '1: Foundation',
        'assignedToId' => $content_manager_id,
        'startDate' => '2025-01-16',
        'endDate' => '2025-01-30'
    ]
];

foreach ($tasks as $task) {
    $api->createTask($project['id'], $task);
}
?>
```

### Option 3: Custom Authentication Integration

Replace the current SAAS authentication with your existing authentication system.

#### Step 1: Update Authentication Middleware

```javascript
// server/customAuth.js
import session from "express-session";
import connectPg from "connect-pg-simple";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export const isAuthenticated = (req, res, next) => {
  // Check your custom authentication logic
  const authToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!authToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Verify token with your PHP backend
  verifyTokenWithPHP(authToken)
    .then(user => {
      req.user = { claims: { sub: user.id } };
      next();
    })
    .catch(() => {
      res.status(401).json({ message: "Unauthorized" });
    });
};

async function verifyTokenWithPHP(token) {
  const response = await fetch('https://your-dms.com/api/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  
  if (!response.ok) {
    throw new Error('Invalid token');
  }
  
  return response.json();
}
```

#### Step 2: PHP Token Verification Endpoint

```php
<?php
// verify_token.php
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';

// Verify token against your session/JWT system
session_start();
if (isset($_SESSION['dashboard_tokens'][$token])) {
    $user = $_SESSION['dashboard_tokens'][$token];
    echo json_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'firstName' => $user['first_name'],
        'lastName' => $user['last_name']
    ]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
}
?>
```

## Excel Export Integration

The dashboard provides Excel export functionality that matches your template structure:

### Columns Exported:
- WBS (Task ID)
- Phase (Foundation/Growth/Authority)
- Pillar (Technical/On-Page/Off-Page/Analytics)
- Task Name
- Assigned To
- Start Date
- End Date
- Progress
- Status

### Custom Export in PHP:

```php
// Download and customize exported data
$api = new SEODashboardAPI('https://your-dashboard.com', $auth_token);
$excel_file = $api->exportProject($project_id);

// Load with PhpSpreadsheet for customization
use PhpOffice\PhpSpreadsheet\IOFactory;

$spreadsheet = IOFactory::load($excel_file);
$worksheet = $spreadsheet->getActiveSheet();

// Add your custom branding/headers
$worksheet->insertNewRowBefore(1, 2);
$worksheet->setCellValue('A1', 'Company SEO Project Report');
$worksheet->setCellValue('A2', 'Generated: ' . date('Y-m-d H:i:s'));

// Save customized version
$writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
$writer->save('custom_seo_report.xlsx');
```

## Deployment Considerations

### Security
1. **HTTPS Required**: Dashboard must be served over HTTPS in production
2. **CORS Configuration**: Configure CORS to allow your DMS domain
3. **Session Security**: Use secure session configuration
4. **Database Security**: Use connection pooling and prepared statements

### Performance
1. **CDN Integration**: Serve static assets via CDN
2. **Database Indexing**: Add indexes on frequently queried columns
3. **Caching**: Implement Redis for session storage in high-traffic environments

### Monitoring
1. **Error Tracking**: Integrate with Sentry or similar service
2. **Performance Monitoring**: Use APM tools for Node.js applications
3. **Database Monitoring**: Monitor PostgreSQL performance

## Customization Options

### Branding
- Update CSS variables in `client/src/index.css` for colors
- Replace logo and branding elements
- Customize glassmorphism effects and animations

### Business Logic
- Modify SEO pillars and phases in `shared/schema.ts`
- Add custom task types and statuses
- Extend project metadata fields

### Integrations
- Add Slack/Teams notifications
- Integrate with project management tools
- Connect to analytics platforms

## Troubleshooting

### Common Issues

1. **Database Connection**: Verify DATABASE_URL format and permissions
2. **Authentication Errors**: Check session configuration and CORS settings
3. **Excel Export Fails**: Ensure write permissions for temporary files
4. **Performance Issues**: Monitor database query performance and add indexes

### Support

For technical support or customization requests, refer to the codebase documentation or contact your development team.

This dashboard provides a comprehensive, production-ready solution for SEO project management that integrates seamlessly with your existing DMS infrastructure while maintaining the premium user experience and liquid glass visual effects.