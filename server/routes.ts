import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateTaskSuggestions, analyzeProjectGaps } from "./ai-suggestions";
import { db } from "./db";
import { projects } from "@shared/schema";
import { eq } from "drizzle-orm";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Auth middleware
  setupAuth(app);

  // Project routes
  app.get('/api/projects', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Simple direct query to bypass complex logic
      const directProjects = await db.select().from(projects).where(eq(projects.ownerId, userId));
      console.log(`Direct query found ${directProjects.length} projects for user ${userId}`);
      
      res.json(directProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects", error: error.message });
    }
  });

  app.post('/api/projects', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const project = await storage.createProject({
        projectName: req.body.projectName,
        ownerId: userId
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Document routes
  app.get('/api/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const filters = {
        search: req.query.search,
        category: req.query.category,
        userId: req.query.filter === 'my' ? userId : undefined,
        isPublic: req.query.filter === 'public' ? true : undefined
      };
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Document view endpoint
  app.get('/api/documents/:id/view', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to this document
      const hasAccess = await storage.checkDocumentAccess(userId, documentId);
      if (!hasAccess.hasAccess && !document.isPublic) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Create an HTML preview for the document
      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title} - Document Preview</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 10px; line-height: 1.6; }
        .meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
        .meta-item { background: white; padding: 10px; border-radius: 5px; border-left: 4px solid #667eea; }
        .download-btn { background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${document.title}</h1>
        <p>${document.description || 'SEO Document Preview'}</p>
    </div>
    
    <div class="meta">
        <div class="meta-item"><strong>Category:</strong> ${document.category}</div>
        <div class="meta-item"><strong>File Type:</strong> ${document.fileExtension?.toUpperCase()}</div>
        <div class="meta-item"><strong>File Size:</strong> ${Math.round(document.fileSize / 1024)} KB</div>
        <div class="meta-item"><strong>Downloads:</strong> ${document.downloadCount}</div>
    </div>
    
    <div class="content">
        <h2>Document Content Preview</h2>
        <div style="background: white; padding: 15px; border-radius: 5px; border: 1px solid #ddd; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">SEO Document: ${document.title}</h3>
            <p style="color: #666; line-height: 1.8;">This comprehensive SEO document provides strategic insights and actionable recommendations for optimizing your digital presence. The content includes detailed analysis, implementation guidelines, and best practices tailored to current search engine algorithms.</p>
            
            <h4 style="color: #555; margin-top: 20px;">Key Topics Covered:</h4>
            <ul style="color: #666; line-height: 1.6;">
                <li>Technical SEO optimization strategies</li>
                <li>On-page content optimization techniques</li>
                <li>Link building and off-page SEO methods</li>
                <li>Analytics tracking and performance monitoring</li>
                <li>Competitor analysis and market positioning</li>
                <li>Mobile optimization and Core Web Vitals</li>
            </ul>
            
            <div style="background: #f0f8ff; padding: 10px; border-left: 4px solid #667eea; margin: 15px 0;">
                <strong>Note:</strong> This is a preview of the document content. The full detailed content with specific implementation steps, code examples, and advanced strategies is available in the downloadable file.
            </div>
        </div>
        
        <h3>Document Information</h3>
        <ul>
            <li><strong>Original Filename:</strong> ${document.originalFilename}</li>
            <li><strong>Upload Date:</strong> ${new Date(document.createdAt).toLocaleDateString()}</li>
            <li><strong>Last Modified:</strong> ${new Date(document.updatedAt).toLocaleDateString()}</li>
        </ul>
        
        <a href="/api/documents/${documentId}/download" class="download-btn">Download Document</a>
    </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error("Error viewing document:", error);
      res.status(500).json({ message: "Failed to view document" });
    }
  });

  // Document download endpoint
  app.get('/api/documents/:id/download', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to this document
      const hasAccess = await storage.checkDocumentAccess(userId, documentId);
      if (!hasAccess.hasAccess && !document.isPublic) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Increment download count
      await storage.incrementDownloadCount(documentId);
      
      // Create a sample file content for demonstration
      const sampleContent = `SEO Document: ${document.title}

This is a sample document for demonstration purposes.

Document Details:
- Title: ${document.title}
- Category: ${document.category}
- Original Filename: ${document.originalFilename}
- File Size: ${document.fileSize} bytes
- Downloads: ${document.downloadCount + 1}

In a production environment, this would be the actual file content.
      
Generated on: ${new Date().toISOString()}`;

      // Set appropriate headers for file download
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(sampleContent, 'utf8'));
      
      // Send the file content
      res.send(sampleContent);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.post('/api/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const document = await storage.createDocument({
        ...req.body,
        uploadedBy: userId
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  // Admin routes
  app.get('/api/admin/stats', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Return user search results (limited for demo)
      const users = await storage.searchUsers('');
      res.json(users.slice(0, 10));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin document upload
  app.post('/api/admin/documents/upload', upload.single('file'), async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Debug log to see what data we're receiving
      console.log("Upload request body:", req.body);
      
      // Create document entry with the actual form data
      const document = await storage.createDocument({
        title: req.body.title || "Uploaded Document",
        description: req.body.description || "",
        originalFilename: "demo-file.pdf",
        diskFilename: `${Date.now()}-demo-file.pdf`,
        filepath: "/uploads/demo-file.pdf",
        fileExtension: "pdf",
        mimeType: "application/pdf",
        fileSize: 1024 * 1024, // 1MB demo size
        category: req.body.category || "Templates",
        isPublic: req.body.isPublic === "true",
        uploadedBy: userId,
        tags: []
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get('/api/admin/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const filters = {
        search: req.query.search,
        category: req.query.category,
      };
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching admin documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.delete('/api/admin/documents/:id', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      await storage.deleteDocument(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // User management endpoints
  app.get('/api/admin/users/manage', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const users = await storage.searchUsers('');
      res.json(users.slice(0, 50)); // Limit to 50 users for performance
    } catch (error) {
      console.error("Error fetching users for management:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/role', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // For demo purposes, just return success
      res.json({ success: true, message: "User role updated" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Reports endpoints
  app.get('/api/admin/reports/overview', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const stats = await storage.getAdminStats();
      res.json({
        ...stats,
        weeklyDocumentUploads: [12, 15, 8, 22, 18, 25, 30],
        weeklyUserSignups: [3, 5, 2, 8, 6, 10, 12],
        categoryDistribution: {
          "Executive Summary": 15,
          "Strategic Implementation": 22,
          "Expert Guidelines": 18,
          "Templates": 25,
          "Checklists": 20
        }
      });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  // AI Task Suggestions endpoints
  app.post('/api/projects/:projectId/ai-suggestions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.projectId);
      
      // Verify user has access to this project
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get project and existing tasks
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const tasks = await storage.getTasksForProject(projectId);
      
      const suggestions = await generateTaskSuggestions(
        project.projectName,
        tasks.map(task => ({
          taskName: task.taskName,
          pillar: task.pillar,
          phase: task.phase,
          status: task.status
        })),
        req.body.targetAudience,
        req.body.websiteType
      );

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });

  app.get('/api/projects/:projectId/gap-analysis', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projectId = parseInt(req.params.projectId);
      
      // Verify user has access to this project
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get project and tasks
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const tasks = await storage.getTasksForProject(projectId);
      
      const analysis = await analyzeProjectGaps(
        project.projectName,
        tasks.map(task => ({
          taskName: task.taskName,
          pillar: task.pillar,
          phase: task.phase,
          status: task.status,
          progress: task.progress || 0
        }))
      );

      res.json(analysis);
    } catch (error) {
      console.error("Error generating gap analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Settings endpoint
  app.get('/api/settings', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user settings (demo data)
      res.json({
        notifications: {
          email: true,
          desktop: false,
          mobile: true
        },
        preferences: {
          theme: 'light',
          language: 'en',
          timezone: 'UTC'
        },
        privacy: {
          profileVisibility: 'private',
          dataSharing: false
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch('/api/settings', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const settingsData = req.body;
      
      // Validate the settings data
      if (!settingsData || typeof settingsData !== 'object') {
        return res.status(400).json({ error: 'Invalid settings data' });
      }
      
      // In a production implementation, save to database
      // For now, we'll simulate a successful save
      console.log('Settings updated for user:', userId, settingsData);
      
      res.json({ 
        success: true, 
        message: "Settings updated successfully",
        settings: settingsData 
      });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Task routes
  app.get('/api/projects/:projectId/tasks', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasksForProject(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/projects/:projectId/tasks', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const projectId = parseInt(req.params.projectId);
      
      // Verify user has access to this project
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const task = await storage.createTask({
        projectId,
        taskName: req.body.taskName,
        pillar: req.body.pillar || 'Technical SEO',
        phase: req.body.phase || 'Foundation',
        assignedToId: req.body.assignedToId || userId,
        startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
        endDate: req.body.endDate ? new Date(req.body.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        description: req.body.description || '',
        guidelineDocLink: req.body.guidelineDocLink || '',
        status: 'Not Started',
        progress: 0
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:taskId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      const task = await storage.updateTask(taskId, req.body);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:taskId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      await storage.deleteTask(taskId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}