import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateTaskSuggestions, analyzeProjectGaps } from "./ai-suggestions";
import { db } from "./db";
import { projects, userActivityLog } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { awardExperience, updateStreak } from "./gamification";

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
  console.log('Setting up SAAS authentication...');
  setupAuth(app);

  // Projects endpoints
  app.get("/api/projects", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      console.log(`Fetching projects for user: ${req.session.userId}`);
      const projects = await storage.getProjectsForUser(req.session.userId);
      console.log(`Raw projects from storage: ${projects.length}`);
      
      // Enhanced project data with statistics
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          const tasks = await storage.getTasksForProject(project.id);
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(task => task.status === "Completed").length;
          const inProgressTasks = tasks.filter(task => task.status === "In Progress").length;
          const overdueTasks = tasks.filter(task => {
            if (task.endDate && task.status !== "Completed") {
              const endDate = new Date(task.endDate);
              const now = new Date();
              return endDate < now;
            }
            return false;
          }).length;
          const averageProgress = totalTasks > 0 ? 
            Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / totalTasks) : 0;

          // Get project members
          const members = await storage.getProjectMembers(project.id);

          return {
            ...project,
            name: project.projectName, // Map projectName to name for frontend compatibility
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            averageProgress,
            members,
            status: 'active',
            priority: 'medium',
            pillar: 'Technical SEO',
            phase: 'Foundation'
          };
        })
      );

      console.log(`Returning ${projectsWithStats.length} projects with stats`);
      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      console.log("Creating project with data:", req.body);
      const projectData = {
        projectName: req.body.projectName || req.body.name || "Untitled Project",
        ownerId: req.session.userId,
      };
      
      console.log("Processed project data:", projectData);
      const project = await storage.createProject(projectData);
      console.log("Created project:", project);
      
      // Emit real-time event to all connected clients
      const io = req.app.get('io');
      if (io) {
        io.emit('project:created', project);
        console.log('Emitted project:created event');
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Get specific project by ID
  app.get("/api/projects/:id", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      console.log(`Fetching project ${projectId} for user: ${userId}`);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      // Check if user has access to this project (owner or member)
      const hasAccess = await storage.checkUserProjectAccess(userId, projectId);
      if (!hasAccess.hasAccess) {
        return res.status(403).json({ error: "Not authorized to access this project" });
      }
      
      // Get enhanced project data with statistics
      const tasks = await storage.getTasksForProject(project.id);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === "Completed").length;
      const inProgressTasks = tasks.filter(task => task.status === "In Progress").length;
      const overdueTasks = tasks.filter(task => {
        if (task.endDate && task.status !== "Completed") {
          const endDate = new Date(task.endDate);
          const now = new Date();
          return endDate < now;
        }
        return false;
      }).length;
      const averageProgress = totalTasks > 0 ? 
        Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / totalTasks) : 0;

      // Get project members
      const members = await storage.getProjectMembers(project.id);

      const enhancedProject = {
        ...project,
        name: project.projectName, // Map projectName to name for frontend compatibility
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        averageProgress,
        members,
        status: 'active',
        priority: 'medium',
        pillar: 'Technical SEO',
        phase: 'Foundation'
      };

      console.log(`Returning project ${projectId} with enhanced data`);
      res.json(enhancedProject);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Delete project endpoint
  app.delete("/api/projects/:id", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const projectId = req.params.id;
      const userId = req.session.userId;
      
      console.log("Deleting project:", projectId, "for user:", userId);
      
      // Check if project exists and user owns it
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      
      if (project.ownerId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this project" });
      }
      
      // Delete the project
      await storage.deleteProject(projectId);
      console.log("Deleted project:", projectId);
      
      // Emit real-time event to all connected clients
      const io = req.app.get('io');
      if (io) {
        io.emit('project:deleted', { id: projectId });
        console.log('Emitted project:deleted event');
      }
      
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
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
      console.log('🔍 Document view request received:', req.params.id);
      const userId = req.session?.userId;
      console.log('👤 User ID from session:', userId);
      
      if (!userId) {
        console.log('❌ No user authentication found');
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const documentId = parseInt(req.params.id);
      console.log('📄 Fetching document ID:', documentId);
      const document = await storage.getDocument(documentId);
      console.log('📄 Document found:', document ? `${document.title} (${document.originalFilename})` : 'null');
      
      if (!document) {
        console.log('❌ Document not found in database');
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check if user has access to this document
      console.log('🔐 Checking document access for user:', userId);
      const hasAccess = await storage.checkDocumentAccess(userId, documentId);
      console.log('🔐 Access check result:', hasAccess);
      console.log('📄 Document isPublic:', document.isPublic);
      
      if (!hasAccess.hasAccess && !document.isPublic) {
        console.log('❌ Access denied - user has no access and document is not public');
        return res.status(403).json({ error: 'Access denied' });
      }
      
      console.log('✅ Access granted, generating HTML preview');
      
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

  // Regular user document upload
  app.post('/api/documents/upload', upload.single('file'), async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Debug log to see what data we're receiving
      console.log("Upload request body:", req.body);
      console.log("Upload file:", req.file);
      
      // Create document entry with the actual form data
      const document = await storage.createDocument({
        title: req.body.title || "Uploaded Document",
        description: req.body.description || "",
        originalFilename: req.file?.originalname || "demo-file.pdf",
        diskFilename: `${Date.now()}-${req.file?.originalname || 'demo-file.pdf'}`,
        filepath: `/uploads/${Date.now()}-${req.file?.originalname || 'demo-file.pdf'}`,
        fileExtension: req.file?.originalname?.split('.').pop() || "pdf",
        mimeType: req.file?.mimetype || "application/pdf",
        fileSize: req.file?.size || 1024 * 1024, // 1MB demo size
        category: req.body.category || "Templates",
        subcategory: req.body.subcategory || null,
        tags: req.body.tags || null,
        isPublic: req.body.isPublic === "true",
        uploadedBy: userId
      });
      
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Document update endpoint
  app.put('/api/documents/:id', async (req: any, res: any) => {
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
      
      // Check if user has permission to edit this document
      const user = await storage.getUser(userId);
      const isAdmin = user?.email === "jaguzman123@hotmail.com" || user?.isAdmin === true;
      const isOwner = document.uploadedBy === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Permission denied. Only document owner or admin can edit.' });
      }
      
      // Update the document with provided fields
      const updateData: Partial<typeof req.body> = {};
      const allowedFields = ['title', 'description', 'category', 'subcategory', 'tags', 'isPublic'];
      
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });
      
      const updatedDocument = await storage.updateDocument(documentId, updateData);
      
      if (!updatedDocument) {
        return res.status(500).json({ error: 'Failed to update document' });
      }
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Document delete endpoint
  app.delete('/api/documents/:id', async (req: any, res: any) => {
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
      
      // Check if user has permission to delete this document
      const user = await storage.getUser(userId);
      const isAdmin = user?.email === "jaguzman123@hotmail.com" || user?.isAdmin === true;
      const isOwner = document.uploadedBy === userId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Permission denied. Only document owner or admin can delete.' });
      }
      
      // Delete the document (this will cascade to related tables)
      await storage.deleteDocument(documentId);
      
      res.json({ success: true, message: 'Document deleted successfully' });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Task-Document Linking Endpoints
  // Get documents linked to a task
  app.get('/api/tasks/:taskId/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      // Verify user has access to this task's project
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const accessResult = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!accessResult.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const linkedDocuments = await storage.getTaskDocuments(taskId);
      res.json(linkedDocuments);
    } catch (error) {
      console.error("Error fetching task documents:", error);
      res.status(500).json({ message: "Failed to fetch task documents" });
    }
  });

  // Link a document to a task
  app.post('/api/tasks/:taskId/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      const { documentId } = req.body;
      
      if (isNaN(taskId) || !documentId) {
        return res.status(400).json({ error: 'Invalid task ID or document ID' });
      }
      
      // Verify user has access to this task's project
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      const accessResult = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!accessResult.hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if document exists
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      const link = await storage.linkDocumentToTask({
        taskId: taskId,
        documentId: parseInt(documentId),
        linkedBy: userId
      });
      res.json(link);
    } catch (error) {
      console.error("Error linking task document:", error);
      res.status(500).json({ message: "Failed to link document to task" });
    }
  });

  // Unlink a document from a task
  app.delete('/api/task-document-links/:linkId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const linkId = parseInt(req.params.linkId);
      if (isNaN(linkId)) {
        return res.status(400).json({ error: 'Invalid link ID' });
      }
      
      // For now, just unlink - in a production system, you'd verify ownership
      await storage.unlinkDocumentFromTask(linkId);
      res.json({ success: true, message: 'Document unlinked successfully' });
    } catch (error) {
      console.error("Error unlinking task document:", error);
      res.status(500).json({ message: "Failed to unlink document from task" });
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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
        subcategory: req.body.subcategory || null,
        tags: req.body.tags || null,
        isPublic: req.body.isPublic === "true",
        uploadedBy: userId
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const searchQuery = req.query.search as string || '';
      const users = await storage.searchUsers(searchQuery);
      
      // Add additional user management data
      const usersWithData = users.map(user => ({
        ...user,
        userRole: user.isAdmin ? 'admin' : 'client',
        memberLevel: 'SEO Specialist', // Default value since this field doesn't exist in schema
        authorityScore: Number(user.memberAuthorityScore) || 0,
        tasksCompleted: 0, // Default value since this field doesn't exist in schema
        averageRating: '0.00' // Default value since this field doesn't exist in schema
      }));
      
      res.json(usersWithData);
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const targetUserId = req.params.id;
      const { role, memberLevel } = req.body;
      
      // Update user role and member level
      await storage.updateUserRole(targetUserId, role, memberLevel);
      
      res.json({ success: true, message: "User role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/admin/users/:id', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const targetUserId = req.params.id;
      
      // Prevent deleting yourself
      if (targetUserId === userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }
      
      await storage.deleteUser(targetUserId);
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
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

  // Gamification endpoints
  app.get('/api/gamification/badges/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const badges = await storage.getUserBadges(userId);
      res.json(badges);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  app.get('/api/gamification/stats/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        experiencePoints: user.experiencePoints || 0,
        currentLevel: user.currentLevel || 1,
        totalBadges: user.totalBadges || 0,
        streakDays: user.streakDays || 0,
        tasksCompleted: user.tasksCompleted || 0,
        averageRating: user.averageRating || "0.00",
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get('/api/gamification/leaderboard/:category', async (req: any, res: any) => {
    try {
      const { category } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getLeaderboard(category, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  app.get('/api/gamification/activity/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const activity = await db
        .select()
        .from(userActivityLog)
        .where(eq(userActivityLog.userId, userId))
        .orderBy(desc(userActivityLog.activityDate))
        .limit(limit);
      
      res.json(activity);
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Performance Analytics endpoints
  app.get('/api/analytics/performance/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const timeRange = req.query.timeRange || '30d';
      
      const performanceData = await storage.getUserPerformanceData(userId, timeRange);
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      res.status(500).json({ message: "Failed to fetch performance data" });
    }
  });

  app.post('/api/users/filtered', async (req: any, res: any) => {
    try {
      const criteria = req.body;
      const filteredUsers = await storage.getFilteredUsers(criteria);
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error filtering users:", error);
      res.status(500).json({ message: "Failed to filter users" });
    }
  });

  app.get('/api/filters/options', async (req: any, res: any) => {
    try {
      // Return available filter options
      const options = {
        roles: ['admin', 'manager', 'client'],
        memberLevels: ['C-Level', 'Manager', 'SEO Lead', 'SEO Expert', 'SEO Specialist', 'Junior', 'Intern'],
        departments: ['Marketing', 'SEO', 'Content', 'Development'],
        skills: ['Technical SEO', 'Content Writing', 'Link Building', 'Analytics'],
        projects: ['E-commerce', 'Local SEO', 'Enterprise', 'Startup']
      };
      res.json(options);
    } catch (error) {
      console.error("Error fetching filter options:", error);
      res.status(500).json({ message: "Failed to fetch filter options" });
    }
  });

  app.get('/api/filters/saved', async (req: any, res: any) => {
    try {
      // Return empty array for now - implement saved filters storage later
      res.json([]);
    } catch (error) {
      console.error("Error fetching saved filters:", error);
      res.status(500).json({ message: "Failed to fetch saved filters" });
    }
  });

  app.post('/api/filters/save', async (req: any, res: any) => {
    try {
      const filterData = req.body;
      // Implement filter saving logic
      res.json({ success: true, id: Date.now().toString() });
    } catch (error) {
      console.error("Error saving filter:", error);
      res.status(500).json({ message: "Failed to save filter" });
    }
  });

  app.post('/api/users/export', async (req: any, res: any) => {
    try {
      const { criteria, format } = req.body;
      const users = await storage.getFilteredUsers(criteria);
      
      if (format === 'csv') {
        const csv = users.map(user => 
          `${user.firstName},${user.lastName},${user.email},${user.role},${user.experiencePoints},${user.currentLevel}`
        ).join('\n');
        const header = 'First Name,Last Name,Email,Role,Experience Points,Level\n';
        res.setHeader('Content-Type', 'text/csv');
        res.send(header + csv);
      } else {
        res.json(users);
      }
    } catch (error) {
      console.error("Error exporting users:", error);
      res.status(500).json({ message: "Failed to export users" });
    }
  });

  // Initialize achievements
  storage.initializeAchievements().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}