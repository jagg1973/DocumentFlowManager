import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Project routes
  app.get('/api/projects', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const projects = await storage.getProjectsForUser(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
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
  app.post('/api/admin/documents/upload', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && user.role !== "admin")) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // For demo purposes, create a mock document entry
      const document = await storage.createDocument({
        title: req.body.title || "Uploaded Document",
        description: req.body.description || "",
        originalFilename: "demo-file.pdf",
        diskFilename: `${Date.now()}-demo-file.pdf`,
        filepath: "/uploads/demo-file.pdf",
        fileExtension: "pdf",
        mimeType: "application/pdf",
        fileSize: 1024 * 1024, // 1MB demo size
        category: req.body.category,
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
      
      // In a real implementation, save settings to database
      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}