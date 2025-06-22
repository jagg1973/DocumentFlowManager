import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Project routes (simplified)
  app.get('/api/projects', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Return empty array for now  
      const projects: any[] = [];
      
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
      
      const projectData = req.body;
      const project = { id: Date.now(), ...projectData, ownerId: userId, createdAt: new Date() };
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  // Simple health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  const httpServer = createServer(app);
  return httpServer;
}