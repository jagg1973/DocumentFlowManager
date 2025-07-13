import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { generateTaskSuggestions, analyzeProjectGaps } from "./ai-suggestions";
import { db } from "./db";
import { projects, userActivityLog } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { awardExperience, updateStreak } from "./gamification";
import { DocumentPreviewService } from "./document-preview";
import { DocumentVersionService } from "./document-versions";
import { SocketEventEmitter } from "./socket-events";
import { WorkflowEngine } from './workflow-engine';
import { AuditService } from './audit-service';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<void> {
  console.log('!!! REGISTERROUTES FUNCTION STARTED !!!');
  console.log('=== REGISTERING API ROUTES FIRST ===');
  console.log('Starting route registration...');
  const documentPreview = new DocumentPreviewService();
  const documentVersions = new DocumentVersionService();
  
  // Get the Socket.IO instance from the app
  const ioInstance = app.get('io');
  const socketEmitter = new SocketEventEmitter(ioInstance);
  
  // Initialize Phase 5 services
  console.log('Initializing Phase 5 services...');
  const workflowEngine = new WorkflowEngine();
  const auditService = new AuditService();
  console.log('Phase 5 services initialized successfully');
  
  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Auth middleware
  console.log('Setting up SAAS authentication...');
  setupAuth(app);

  // Projects endpoints
  console.log('=== REGISTERING PROJECTS ROUTES ===');
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
      if (!hasAccess) {
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

  // Tasks endpoints
  app.get("/api/projects/:id/tasks", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to access this project's tasks" });
      }
      const tasks = await storage.getTasksForProject(projectId);
      res.json(tasks);
    } catch (error) {
      console.error(`Error fetching tasks for project ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/projects/:id/tasks", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to create tasks for this project" });
      }
      // Handle assignedToId properly - convert 'unassigned' to null
      const taskData = { ...req.body, projectId, createdBy: req.session.userId };
      if (taskData.assignedToId === 'unassigned' || taskData.assignedToId === '' || !taskData.assignedToId) {
        taskData.assignedToId = null;
      } else if (taskData.assignedToId) {
        // If a specific user is assigned, verify they exist
        try {
          const assignedUser = await storage.getUser(taskData.assignedToId);
          if (!assignedUser) {
            taskData.assignedToId = null; // User doesn't exist, set to unassigned
          }
        } catch (error) {
          taskData.assignedToId = null; // Error getting user, set to unassigned
        }
      }
      
      const task = await storage.createTask(taskData);
      
      const io = req.app.get('io');
      if (io) {
        io.to(`project-${projectId}`).emit('task:created', task);
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error(`Error creating task for project ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Enhanced Task Management Endpoints
  
  // Task Followers endpoints
  app.get("/api/tasks/:taskId/followers", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task followers" });
      }
      
      const followers = await storage.getTaskFollowers(taskId);
      res.json(followers);
    } catch (error) {
      console.error(`Error fetching task followers:`, error);
      res.status(500).json({ error: "Failed to fetch task followers" });
    }
  });

  app.post("/api/tasks/:taskId/followers", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const { userId, followType = 'explicit' } = req.body;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to modify task followers" });
      }
      
      await storage.addTaskFollower(taskId, userId || req.session.userId, followType);
      
      // Log activity
      await storage.createTaskActivity({
        taskId,
        userId: req.session.userId,
        activityType: 'follower_added',
        description: `User ${userId || req.session.userId} is now following this task`,
      });
      
      res.status(201).json({ success: true });
    } catch (error) {
      console.error(`Error adding task follower:`, error);
      res.status(500).json({ error: "Failed to add task follower" });
    }
  });

  app.delete("/api/tasks/:taskId/followers/:userId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const { userId } = req.params;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to modify task followers" });
      }
      
      await storage.removeTaskFollower(taskId, userId);
      
      // Log activity
      await storage.createTaskActivity({
        taskId,
        userId: req.session.userId,
        activityType: 'follower_removed',
        description: `User ${userId} is no longer following this task`,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error removing task follower:`, error);
      res.status(500).json({ error: "Failed to remove task follower" });
    }
  });

  // Task Comments endpoints
  app.get("/api/tasks/:taskId/comments", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task comments" });
      }
      
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (error) {
      console.error(`Error fetching task comments:`, error);
      res.status(500).json({ error: "Failed to fetch task comments" });
    }
  });

  app.post("/api/tasks/:taskId/comments", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const { content, parentCommentId, commentType = 'comment' } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
      
      const comment = await storage.createTaskComment({
        taskId,
        parentCommentId: parentCommentId || null,
        authorId: req.session.userId,
        content: content.trim(),
      });
      
      // Log activity
      await storage.createTaskActivity({
        taskId,
        userId: req.session.userId,
        activityType: 'comment_added',
        description: parentCommentId ? 'Added a reply to a comment' : 'Added a comment',
      });
      
       // Emit real-time event
      const io = req.app.get('io');
      if (io) {
        io.to(`task-${taskId}`).emit('comment:added', comment);
      }
      
      res.status(201).json(comment);
    } catch (error) {
      console.error(`Error creating task comment:`, error);
      res.status(500).json({ error: "Failed to create task comment" });
    }
  });

  app.put("/api/tasks/:taskId/comments/:commentId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const commentId = parseInt(req.params.commentId);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      
      const updatedComment = await storage.updateTaskComment(commentId, {
        content: content.trim(),
      });
      
      if (!updatedComment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      res.json(updatedComment);
    } catch (error) {
      console.error(`Error updating comment:`, error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  app.delete("/api/tasks/:taskId/comments/:commentId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const commentId = parseInt(req.params.commentId);
      
      await storage.deleteTaskComment(commentId);
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting comment:`, error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Task Attachments endpoints
  app.get("/api/tasks/:taskId/attachments", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task attachments" });
      }
      
      const attachments = await storage.getTaskAttachments(taskId);
      res.json(attachments);
    } catch (error) {
      console.error(`Error fetching task attachments:`, error);
      res.status(500).json({ error: "Failed to fetch task attachments" });
    }
  });

  app.post("/api/tasks/:taskId/attachments/upload", upload.single('file'), async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to upload attachments to this task" });
      }
      
      // Save file (you'll need to implement file storage)
      const storedFilename = `task_${taskId}_${Date.now()}_${file.originalname}`;
      const filePath = `/uploads/tasks/${storedFilename}`;
      
      const attachment = await storage.createTaskAttachment({
        taskId,
        userId: req.session.userId,
        filename: storedFilename,
        originalName: file.originalname,
        filePath,
        size: file.size,
        mimeType: file.mimetype,
      });
      
      // Log activity
      await storage.createTaskActivity({
        taskId,
        userId: req.session.userId,
        activityType: 'attachment_added',
        description: `Uploaded attachment: ${file.originalname}`,
      });
      
      res.status(201).json(attachment);
    } catch (error) {
      console.error(`Error uploading task attachment:`, error);
      res.status(500).json({ error: "Failed to upload task attachment" });
    }
  });

  app.delete("/api/attachments/:attachmentId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const attachmentId = parseInt(req.params.attachmentId);
      
      // TODO: Add ownership and access checks
      await storage.deleteTaskAttachment(attachmentId);
      
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting attachment:`, error);
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  // Task Activities endpoint
  app.get("/api/tasks/:taskId/activities", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task activities" });
      }
      
      const activities = await storage.getTaskActivities(taskId);
      res.json(activities);
    } catch (error) {
      console.error(`Error fetching task activities:`, error);
      res.status(500).json({ error: "Failed to fetch task activities" });
    }
  });

  // Task Time Entries endpoints
  app.get("/api/tasks/:taskId/time-entries", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task time entries" });
      }
      
      const timeEntries = await storage.getTimeEntries(taskId);
      res.json(timeEntries);
    } catch (error) {
      console.error(`Error fetching task time entries:`, error);
      res.status(500).json({ error: "Failed to fetch task time entries" });
    }
  });  
  // Alias route for frontend compatibility
  app.get("/api/tasks/:taskId/time-logs", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task time entries" });
      }
      
      const timeEntries = await storage.getTimeEntries(taskId);
      res.json(timeEntries);
    } catch (error) {
      console.error(`Error fetching task time entries:`, error);
      res.status(500).json({ error: "Failed to fetch task time entries" });
    }
  });

  // Notifications endpoints
  app.get("/api/notifications", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const notifications = await storage.getTaskNotifications(req.session.userId);
      res.json(notifications);
    } catch (error) {
      console.error(`Error fetching notifications:`, error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:notificationId/read", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const notificationId = parseInt(req.params.notificationId);
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error marking notification as read:`, error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  
  // Admin routes
  console.log('=== REGISTERING ADMIN ROUTES ===');
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
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000);
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const diskFilename = `${timestamp}-${randomId}-${path.basename(req.file.originalname, fileExtension)}${fileExtension}`;
      const filepath = path.join(process.cwd(), 'uploads', diskFilename);
      
      // Save file to disk
      await fs.promises.writeFile(filepath, req.file.buffer);
      
      // Create document entry with actual file data
      const document = await storage.createDocument({
        title: req.body.title || path.basename(req.file.originalname, fileExtension),
        description: req.body.description || "",
        originalFilename: req.file.originalname,
        diskFilename: diskFilename,
        filepath: `/uploads/${diskFilename}`,
        fileExtension: fileExtension.replace('.', ''),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        category: req.body.category || "General",
        subcategory: req.body.subcategory || null,
        tags: req.body.tags || null,
        isPublic: req.body.isPublic === "true",
        uploadedBy: userId
      });
      
      console.log(`Admin file uploaded successfully: ${req.file.originalname} (${req.file.size} bytes)`);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document", error: error instanceof Error ? error.message : String(error) });
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

  // Get recent documents for admin
  app.get('/api/admin/documents/recent', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const documents = await storage.getDocuments();
      // Return only the 10 most recent documents
      const recentDocuments = documents
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 10);
      
      res.json(recentDocuments);
    } catch (error) {
      console.error("Error fetching recent documents:", error);
      res.status(500).json({ message: "Failed to fetch recent documents" });
    }
  });

  // Get admin activity feed
  app.get('/api/admin/activity', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // For now, return a simple activity feed
      // You can expand this to include actual activity logs from your database
      const activities = [
        {
          id: 1,
          type: 'user_login',
          description: 'Admin logged in',
          timestamp: new Date().toISOString(),
          user: user.firstName + ' ' + user.lastName
        },
        {
          id: 2,
          type: 'task_created',
          description: 'New task created',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          user: 'System'
        }
      ];
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching admin activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Regular user document endpoints
  app.get('/api/documents', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const filters = {
        search: req.query.search,
        category: req.query.category,
        isPublic: true // Regular users can only see public documents
      };
      
      const documents = await storage.getDocuments(filters);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', upload.single('file'), async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      console.log('Upload request body:', req.body);
      console.log('File info:', req.file ? { 
        originalname: req.file.originalname, 
        mimetype: req.file.mimetype, 
        size: req.file.size 
      } : 'No file attached');
      
      // Check if file was uploaded
      if (!req.file) {
        console.log('No file uploaded - returning 400');
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000);
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const diskFilename = `${timestamp}-${randomId}-${path.basename(req.file.originalname, fileExtension)}${fileExtension}`;
      const filepath = path.join(process.cwd(), 'uploads', diskFilename);
      
      // Save file to disk
      await fs.promises.writeFile(filepath, req.file.buffer);
      
      // Create document entry with actual file data
      const document = await storage.createDocument({
        title: req.body.title || path.basename(req.file.originalname, fileExtension),
        description: req.body.description || "",
        originalFilename: req.file.originalname,
        diskFilename: diskFilename,
        filepath: `/uploads/${diskFilename}`,
        fileExtension: fileExtension.replace('.', ''),
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        category: req.body.category || "General",
        subcategory: req.body.subcategory || null,
        tags: req.body.tags || null,
        isPublic: req.body.isPublic === "true",
        uploadedBy: userId
      });
      
      console.log(`File uploaded successfully: ${req.file.originalname} (${req.file.size} bytes)`);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/documents/:id/view', async (req: any, res: any) => {
    console.log('Document view route accessed');
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
      if (!document.isPublic) {
        const user = await storage.getUser(userId);
        if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Generate preview using the document preview service
      console.log('Generating preview for document:', document.originalFilename, 'type:', document.mimeType);
      const fullPath = path.join(process.cwd(), 'uploads', document.diskFilename);
      const previewResult = await documentPreview.generatePreview(fullPath, document.mimeType, document.originalFilename, documentId);
      
      if (previewResult.type === 'error') {
        return res.status(500).json({ 
          error: 'Preview generation failed', 
          message: previewResult.error 
        });
      }
      
      // Set appropriate content type and send response
      res.setHeader('Content-Type', previewResult.contentType);
      
      if (previewResult.type === 'html') {
        res.send(previewResult.content);
      } else if (previewResult.type === 'json') {
        res.json(previewResult.content);
      } else {
        res.send(previewResult.content);
      }
      
    } catch (error) {
      console.error("Error viewing document:", error);
      res.status(500).json({ message: "Failed to view document" });
    }
  });

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
      if (!document.isPublic) {
        const user = await storage.getUser(userId);
        if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Serve the actual file for download
      const fullPath = path.join(process.cwd(), 'uploads', document.diskFilename);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
      res.sendFile(fullPath);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

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
      
      // Check if user owns this document or is admin
      const user = await storage.getUser(userId);
      if (document.uploadedBy !== userId && 
          (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      await storage.deleteDocument(documentId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

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
      
      // Check if user owns this document or is admin
      const user = await storage.getUser(userId);
      if (document.uploadedBy !== userId && 
          (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin))) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const updates = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        subcategory: req.body.subcategory,
        tags: req.body.tags,
        isPublic: req.body.isPublic
      };
      
      const updatedDocument = await storage.updateDocument(documentId, updates);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
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
      if (!access) {
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
          pillar: task.pillar || 'General',
          phase: task.phase || 'Planning',
          status: task.status || 'Not Started'
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
      if (!access) {
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
          pillar: task.pillar || 'General',
          phase: task.phase || 'Planning',
          status: task.status || 'Not Started',
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
      if (!access) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Handle assignedToId properly - convert 'unassigned' to null
      let assignedToId = req.body.assignedToId;
      if (assignedToId === 'unassigned' || assignedToId === '' || !assignedToId) {
        assignedToId = null;
      } else if (assignedToId && assignedToId !== userId) {
        // If a specific user is assigned, verify they exist and have access to this project
        try {
          const assignedUser = await storage.getUser(assignedToId);
          if (!assignedUser) {
            assignedToId = null; // User doesn't exist, set to unassigned
          }
        } catch (error) {
          assignedToId = null; // Error getting user, set to unassigned
        }
      }
      
      const task = await storage.createTask({
        projectId,
        taskName: req.body.taskName,
        pillar: req.body.pillar || 'Technical SEO',
        phase: req.body.phase || 'Foundation',
        assignedToId: assignedToId,
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
        experiencePoints: 0, // Default value since property doesn't exist
        currentLevel: 1, // Default value since property doesn't exist
        totalBadges: 0, // Default value since property doesn't exist
        streakDays: 0, // Default value since property doesn't exist
        tasksCompleted: 0, // Default value since property doesn't exist
        averageRating: "0.00", // Default value since property doesn't exist
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

  // Project Members endpoint
  app.get('/api/projects/:id/members', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const projectId = parseInt(req.params.id);
      console.log(`Fetching members for project ${projectId}`);
      
      // Check if user has access to this project
      const hasAccess = await storage.checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to access this project' });
      }
      
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  // Project Stats endpoint
  app.get('/api/projects/:id/stats', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const projectId = parseInt(req.params.id);
      console.log(`Fetching stats for project ${projectId}`);
      
      // Check if user has access to this project
      const hasAccess = await storage.checkUserProjectAccess(userId, projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to access this project' });
      }
      
      const tasks = await storage.getTasksForProject(projectId);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === "Completed").length;
      const inProgressTasks = tasks.filter(task => task.status === "In Progress").length;
      const notStartedTasks = tasks.filter(task => task.status === "Not Started").length;
      const averageProgress = totalTasks > 0 ? 
        Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / totalTasks) : 0;
      
      const stats = {
        totalTasks,
        completedTasks,
        inProgressTasks,
        notStartedTasks,
        averageProgress,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching project stats:", error);
      res.status(500).json({ message: "Failed to fetch project stats" });
    }
  });

  // User Notifications endpoint
  app.get('/api/users/:identifier/notifications', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const identifier = req.params.identifier;
      console.log(`Fetching notifications for user ${identifier}`);
      
      // Check if user is requesting their own notifications or has admin access
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      let targetUserId = userId;
      
      // If identifier is not the current user, check if they have admin access
      if (identifier !== userId && identifier !== currentUser.email) {
        if (currentUser.email !== "jaguzman123@hotmail.com" && !currentUser.isAdmin) {
          return res.status(403).json({ error: 'Not authorized to access these notifications' });
        }
        
        // Try to find the target user
        const targetUser = await storage.getUserByEmail(identifier);
        if (!targetUser) {
          return res.status(404).json({ error: 'Target user not found' });
        }
        targetUserId = targetUser.id;
      }
      
      const notifications = await storage.getTaskNotifications(targetUserId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ message: "Failed to fetch user notifications" });
    }
  });

  // Task Stats endpoint
  app.get('/api/tasks/:id/stats', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.id);
      console.log(`Fetching stats for task ${taskId}`);
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized to access this task' });
      }
      
      // Get task-related stats
      const comments = await storage.getTaskComments(taskId);
      const attachments = await storage.getTaskAttachments(taskId);
      const timeEntries = await storage.getTimeEntries(taskId);
      const activities = await storage.getTaskActivities(taskId);
      
      const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      
      const stats = {
        commentsCount: comments.length,
        attachmentsCount: attachments.length,
        timeEntriesCount: timeEntries.length,
        activitiesCount: activities.length,
        totalTimeSpent,
        progress: task.progress || 0,
        status: task.status,
        daysOverdue: task.endDate && task.status !== "Completed" ? 
          Math.max(0, Math.ceil((Date.now() - new Date(task.endDate).getTime()) / (1000 * 60 * 60 * 24))) : 0
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching task stats:", error);
      res.status(500).json({ message: "Failed to fetch task stats" });
    }
  });

  // Fix PUT /api/tasks/:taskId to handle empty body
  app.put('/api/tasks/:taskId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      console.log('PUT /api/tasks/:taskId called with:', { taskId, body: req.body });
      
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      // Check if body is empty or has no valid update fields
      const validFields = ['taskName', 'description', 'status', 'progress', 'pillar', 'phase', 'assignedToId', 'startDate', 'endDate', 'guidelineDocLink', 'estimatedHours', 'actualHours', 'priority'];
      const hasValidUpdates = Object.keys(req.body).some(key => validFields.includes(key) && req.body[key] !== undefined);
      
      if (!hasValidUpdates) {
        console.log('No valid updates provided, returning current task');
        const currentTask = await storage.getTask(taskId);
        if (!currentTask) {
          return res.status(404).json({ error: 'Task not found' });
        }
        return res.json(currentTask);
      }
      
      const task = await storage.updateTask(taskId, req.body);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ 
        message: "Failed to update task", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Initialize achievements
  storage.initializeAchievements().catch(console.error);

  // ====== PHASE 1 COMPLETION - NEW ENDPOINTS ======

  // Task Permissions API
  app.get('/api/tasks/:taskId/permissions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      const permissions = await storage.getTaskPermissions(taskId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching task permissions:", error);
      res.status(500).json({ message: "Failed to fetch task permissions" });
    }
  });

  app.post('/api/tasks/:taskId/permissions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      const { userId: targetUserId, permission } = req.body;
      if (!targetUserId || !permission) {
        return res.status(400).json({ error: 'Missing required fields: userId and permission' });
      }
      
      const newPermission = await storage.createTaskPermission({
        taskId,
        userId: targetUserId,
        permissionType: permission,
        grantedBy: userId
      });
      
      res.status(201).json(newPermission);
    } catch (error) {
      console.error("Error creating task permission:", error);
      res.status(500).json({ message: "Failed to create task permission" });
    }
  });

  app.put('/api/tasks/:taskId/permissions/:permissionId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      const permissionId = parseInt(req.params.permissionId);
      
      if (isNaN(taskId) || isNaN(permissionId)) {
        return res.status(400).json({ error: 'Invalid task ID or permission ID' });
      }
      
      const { permission } = req.body;
      if (!permission) {
        return res.status(400).json({ error: 'Missing required field: permission' });
      }
      
      // Get all permissions for the task and find the one with the matching ID
      const allPermissions = await storage.getTaskPermissions(taskId);
      const existingPermission = allPermissions.find(p => p.id === permissionId);
      
      if (!existingPermission) {
        return res.status(404).json({ error: 'Permission not found' });
      }
      
      const updatedPermission = await storage.updateTaskPermission(taskId, existingPermission.userId, {
        permissionType: permission

      });
      
      if (!updatedPermission) {
        return res.status(404).json({ error: 'Permission not found' });
      }
      
      res.json(updatedPermission);
    } catch (error) {
      console.error("Error updating task permission:", error);
      res.status(500).json({ message: "Failed to update task permission" });
    }
  });

  app.delete('/api/tasks/:taskId/permissions/:permissionId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      const permissionId = parseInt(req.params.permissionId);
      
      if (isNaN(taskId) || isNaN(permissionId)) {
        return res.status(400).json({ error: 'Invalid task ID or permission ID' });
      }
      
      // Get all permissions for the task and find the one with the matching ID
      const allPermissions = await storage.getTaskPermissions(taskId);
      const existingPermission = allPermissions.find(p => p.id === permissionId);
      
      if (!existingPermission) {
        return res.status(404).json({ error: 'Permission not found' });
      }
      
      await storage.deleteTaskPermission(taskId, existingPermission.userId);
      
      res.json({ message: 'Permission deleted successfully' });
    } catch (error) {
      console.error("Error deleting task permission:", error);
      res.status(500).json({ message: "Failed to delete task permission" });
    }
  });

  // Comment Reactions API
  app.post('/api/tasks/comments/:commentId/reactions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment ID' });
      }
      
      const { reactionType } = req.body;
      if (!reactionType) {
        return res.status(400).json({ error: 'Missing required field: reactionType' });
      }
      
      const reaction = await storage.createTaskCommentReaction({
        commentId,
        userId,
        reactionType
      });
      
      res.status(201).json(reaction);
    } catch (error) {
      console.error("Error creating comment reaction:", error);
      res.status(500).json({ message: "Failed to create comment reaction" });
    }
  });

  app.delete('/api/tasks/comments/:commentId/reactions/:reactionId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
           if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const commentId = parseInt(req.params.commentId);
      const reactionId = parseInt(req.params.reactionId);
      
      if (isNaN(commentId) || isNaN(reactionId)) {
        return res.status(400).json({ error: 'Invalid comment ID or reaction ID' });
      }
      
      // For now, we'll pass placeholder values since the function signature doesn't match the route
      // TODO: Fix the function signature to match the route or vice versa
      await storage.deleteTaskCommentReaction(commentId, userId, "placeholder");
      
      res.json({ message: 'Reaction deleted successfully' });
    } catch (error) {
      console.error("Error deleting comment reaction:", error);
      res.status(500).json({ message: "Failed to delete comment reaction" });
    }
  });

  // Comment Mentions API
  app.post('/api/tasks/comments/:commentId/mentions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment ID' });
      }
      
      const { mentionedUserId } = req.body;
           if (!mentionedUserId) {
        return res.status(400).json({ error: 'Missing required field: mentionedUserId' });
      }
      
      const mention = await storage.createTaskCommentMention({
        commentId,
        mentionedUserId
      });
      
      res.status(201).json(mention);
    } catch (error) {
      console.error("Error creating comment mention:", error);
      res.status(500).json({ message: "Failed to create comment mention" });
    }
  });

  app.get('/api/tasks/comments/:commentId/mentions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const commentId = parseInt(req.params.commentId);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: 'Invalid comment ID' });
      }
      
      const mentions = await storage.getTaskCommentMentions(commentId);
      res.json(mentions);
    } catch (error) {
      console.error("Error fetching comment mentions:", error);
      res.status(500).json({ message: "Failed to fetch comment mentions" });
    }
  });

  // Task Activities API - POST endpoint (create activity)
  app.post('/api/tasks/:taskId/activities', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const taskId = parseInt(req.params.taskId);
      if (isNaN(taskId)) {
        return res.status(400).json({ error: 'Invalid task ID' });
      }
      
      const { activityType, description } = req.body;
      if (!activityType || !description) {
        return res.status(400).json({ error: 'Missing required fields: activityType and description' });
      }
      
      const activity = await storage.createTaskActivity({
        taskId,
        userId,
        activityType,
        description
      });
      
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating task activity:", error);
      res.status(500).json({ message: "Failed to create task activity" });
    }
  });

  // ====== END PHASE 1 COMPLETION ======
  app.get('/api/test-documents', async (req: any, res: any) => {
    res.json({ message: 'Documents endpoint is working' });
  });

  // Route for serving raw document files (for embedding PDFs, etc.)
  app.get('/api/documents/:id/raw', async (req: any, res: any) => {
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
      if (!document.isPublic) {
        const user = await storage.getUser(userId);
        if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      
      // Serve the raw file
      const fullPath = path.join(process.cwd(), 'uploads', document.diskFilename);
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${document.originalFilename}"`);
      res.sendFile(fullPath);
      
    } catch (error) {
      console.error("Error serving raw document:", error);
      res.status(500).json({ message: "Failed to serve document" });
    }
  });

  // Version History API endpoints
  app.get('/api/documents/:id/versions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const documentId = parseInt(req.params.id);
      const versions = await documentVersions.getDocumentVersions(documentId);
      
      res.json(versions);
    } catch (error) {
      console.error("Error fetching document versions:", error);
      res.status(500).json({ message: "Failed to fetch document versions", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/documents/:id/versions', upload.single('file'), async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const documentId = parseInt(req.params.id);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Save the new version file
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const diskFilename = `${timestamp}_${file.originalname}`;
      const filePath = path.join(uploadsDir, diskFilename);
      
      fs.writeFileSync(filePath, file.buffer);

      const version = await documentVersions.createVersion(
        documentId,
        diskFilename,
        file.size,
        req.body.changeDescription || 'Updated document',
        userId
      );

      res.status(201).json(version);
    } catch (error) {
      console.error("Error creating document version:", error);
      res.status(500).json({ message: "Failed to create document version", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/documents/:id/versions/:versionId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const documentId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      const versions = await documentVersions.getDocumentVersions(documentId);
      const version = versions.find(v => v.id === versionId);
      
      if (!version) {
        return res.status(404).json({ error: 'Version not found' });
      }

      res.json(version);
    } catch (error) {
      console.error("Error fetching document version:", error);
      res.status(500).json({ message: "Failed to fetch document version", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/documents/:id/versions/:versionId/restore', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const documentId = parseInt(req.params.id);
      const versionId = parseInt(req.params.versionId);
      
      const success = await documentVersions.restoreVersion(documentId, versionId, userId);
      
      if (!success) {
        return res.status(404).json({ error: 'Version not found or restore failed' });
      }

      res.json({ message: 'Version restored successfully' });
    } catch (error) {
      console.error("Error restoring document version:", error);
      res.status(500).json({ message: "Failed to restore document version", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/documents/:id/versions/compare/:versionId1/:versionId2', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const documentId = parseInt(req.params.id);
      const versionId1 = parseInt(req.params.versionId1);
      const versionId2 = parseInt(req.params.versionId2);
      
      const comparison = await documentVersions.compareVersions(versionId1, versionId2);
      
      res.json(comparison);
    } catch (error) {
      console.error("Error comparing document versions:", error);
      res.status(500).json({ message: "Failed to compare document versions", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Analytics routes
  // app.use('/api/analytics', analyticsRouter);

  // Reports routes
  // app.use('/api/reports', reportsRouter);

  // AI routes
  // app.use('/api/ai', aiRouter);

  // Workflows routes
  // app.use('/api/workflows', workflowsRouter);

  // Audit routes
  // app.use('/api/audit', auditRouter);

  // Enterprise routes
  // app.use('/api/enterprise', enterpriseRouter);


  // ========== PHASE 5: WORKFLOW AUTOMATION ROUTES =========
  console.log('=== REGISTERING PHASE 5 WORKFLOW ROUTES ===');
  
  // Workflow Rules Management
  app.get('/api/workflows/rules', async (req: any, res: any) => {
    console.log('=== WORKFLOW RULES ENDPOINT REACHED ===');
    console.log('Session:', req.session);
    try {
      const userId = req.session?.userId;
      console.log('User ID from session:', userId);
      if (!userId) {
        console.log('No user ID in session, returning 401');
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const rules = workflowEngine.getRules();
      console.log('Retrieved rules:', rules.length);
      res.json(rules);
    } catch (error) {
      console.error('Error fetching workflow rules:', error);
      res.status(500).json({ error: 'Failed to fetch workflow rules' });
    }
  });

  app.post('/api/workflows/rules', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const ruleData = { 
        ...req.body, 
        createdBy: userId,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0
      };
      workflowEngine.saveRule(ruleData);
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'create_workflow_rule',
        resource: 'workflow_rule',
        resourceId: ruleData.id,
        details: { ruleName: ruleData.name },
        success: true,
        risk: 'low',
        category: 'workflow'
      });
      
      res.status(201).json(ruleData);
    } catch (error) {
      console.error('Error creating workflow rule:', error);
      res.status(500).json({ error: 'Failed to create workflow rule' });
    }
  });

  app.put('/api/workflows/rules/:ruleId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { ruleId } = req.params;
      const existingRule = workflowEngine.getRule(ruleId);
      if (!existingRule) {
        return res.status(404).json({ error: 'Workflow rule not found' });
      }
      
      const updatedRule = { ...existingRule, ...req.body, updatedAt: new Date() };
      workflowEngine.saveRule(updatedRule);
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'update_workflow_rule',
        resource: 'workflow_rule',
        resourceId: ruleId,
        details: req.body,
        success: true,
        risk: 'medium',
        category: 'workflow'
      });
      
      res.json(updatedRule);
    } catch (error) {
      console.error('Error updating workflow rule:', error);
      res.status(500).json({ error: 'Failed to update workflow rule' });
    }
  });

  app.delete('/api/workflows/rules/:ruleId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { ruleId } = req.params;
      await workflowEngine.deleteRule(ruleId);
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'delete_workflow_rule',
        resource: 'workflow_rule',
        resourceId: ruleId,
        details: {},
        success: true,
        risk: 'high',
        category: 'workflow'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting workflow rule:', error);
      res.status(500).json({ error: 'Failed to delete workflow rule' });
    }
  });

  // Workflow Executions
  app.get('/api/workflows/executions', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const executions = workflowEngine.getRecentExecutions(50);
      res.json(executions);
    } catch (error) {
      console.error('Error fetching workflow executions:', error);
      res.status(500).json({ error: 'Failed to fetch workflow executions' });
    }
  });

  app.post('/api/workflows/rules/:ruleId/execute', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { ruleId } = req.params;
      const rule = workflowEngine.getRule(ruleId);
      if (!rule) {
        return res.status(404).json({ error: 'Workflow rule not found' });
      }
      
      // Simulate execution for demo purposes
      const execution = {
        id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ruleId,
        status: 'completed',
        timestamp: new Date()
      };
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'execute_workflow_rule',
        resource: 'workflow_rule',
        resourceId: ruleId,
        details: { executionId: execution.id },
        success: true,
        risk: 'medium',
        category: 'workflow'
      });
      
      res.json(execution);
    } catch (error) {
      console.error('Error executing workflow rule:', error);
      res.status(500).json({ error: 'Failed to execute workflow rule' });
    }
  });

  // Workflow Statistics
  app.get('/api/workflows/stats', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const stats = workflowEngine.getExecutionStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching workflow statistics:', error);
      res.status(500).json({ error: 'Failed to fetch workflow statistics' });
    }
  });

  // ========== PHASE 5: AUDIT & COMPLIANCE ROUTES =========
  
  // Audit Events
  console.log('=== REGISTERING AUDIT EVENTS ROUTES ===');
  app.get('/api/audit/events', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { page = 1, limit = 50, filter } = req.query;
      const events = await auditService.getAuditEvents(filter ? JSON.parse(filter as string) : {});
      
      res.json(events);
    } catch (error) {
      console.error('Error fetching audit events:', error);
      res.status(500).json({ error: 'Failed to fetch audit events' });
    }
  });

  app.get('/api/audit/events/:eventId', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { eventId } = req.params;
      const events = await auditService.getAuditEvents({ limit: 1000 });
      const event = events.find(e => e.id === eventId);
      
      if (!event) {
        return res.status(404).json({ error: 'Audit event not found' });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Error fetching audit event:', error);
      res.status(500).json({ error: 'Failed to fetch audit event' });
    }
  });

  // Security Events
  app.get('/api/audit/security-events', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const events = await auditService.getSecurityEvents({});
      res.json(events);
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.status(500).json({ error: 'Failed to fetch security events' });
    }
  });

  app.post('/api/audit/security-events/:eventId/resolve', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { eventId } = req.params;
      const { resolution } = req.body;
      
      await auditService.resolveSecurityEvent(eventId, userId, resolution);
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'resolve_security_event',
        resource: 'security_event',
        resourceId: eventId,
        details: { resolution },
        success: true,
        risk: 'high',
        category: 'security'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error resolving security event:', error);
      res.status(500).json({ error: 'Failed to resolve security event' });
    }
  });

  // Compliance Reports
  app.get('/api/audit/compliance-reports', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const reports = await auditService.getComplianceReports();
      res.json(reports);
    } catch (error) {
      console.error('Error fetching compliance reports:', error);
      res.status(500).json({ error: 'Failed to fetch compliance reports' });
    }
  });

  app.post('/api/audit/compliance-reports', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const { type, period } = req.body;
      const report = await auditService.generateComplianceReport(type, period, userId);
      
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'generate_compliance_report',
        resource: 'compliance_report',
        resourceId: report.id,
        details: { type, period },
        success: true,
        risk: 'low',
        category: 'compliance'
      });
      
      res.status(201).json(report);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });

  // Audit Statistics
  app.get('/api/audit/stats', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const period = { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() };
      const stats = await auditService.getAuditStatistics(period);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
      res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
  });

  // ========== PHASE 5: ENTERPRISE SETTINGS ROUTES =========
  
  // Enterprise Configuration
  app.get('/api/enterprise/settings', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user has admin privileges
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      // Return enterprise settings (for now, return mock data)
      const enterpriseSettings = {
        security: {
          ssoEnabled: false,
          mfaRequired: false,
          sessionTimeout: 30,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireNumbers: true,
            requireSpecialChars: true
          }
        },
        workflow: {
          autoAssignmentEnabled: true,
          approvalWorkflowEnabled: false,
          escalationEnabled: true,
          maxWorkflowDepth: 10
        },
        audit: {
          enabled: true,
          retentionPeriod: 365,
          realTimeMonitoring: true,
          complianceReports: true
        },
        integrations: {
          slackEnabled: false,
          emailEnabled: true,
          webhooksEnabled: true,
          apiRateLimit: 1000
        }
      };
      
      res.json(enterpriseSettings);
    } catch (error) {
      console.error('Error fetching enterprise settings:', error);
      res.status(500).json({ error: 'Failed to fetch enterprise settings' });
    }
  });

  app.put('/api/enterprise/settings', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Check if user has admin privileges
      const user = await storage.getUser(userId);
      if (!user || (user.email !== "jaguzman123@hotmail.com" && !user.isAdmin)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      
      const settings = req.body;
      
      // Log the settings update
      await auditService.logEvent({
        userId,
        userEmail: req.session.userEmail || 'unknown',
        action: 'update_enterprise_settings',
        resource: 'enterprise_settings',
        details: settings,
        success: true,
        risk: 'high',
        category: 'system'
      });
      
      // In a real implementation, save to database
      console.log('Enterprise settings updated:', settings);
      
      res.json({ success: true, settings });
    } catch (error) {
      console.error('Error updating enterprise settings:', error);
      res.status(500).json({ error: 'Failed to update enterprise settings' });
    }
  });

  // Enterprise Health Check
  app.get('/api/enterprise/health', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          workflow: 'healthy',
          audit: 'healthy',
          notifications: 'healthy'
        },
        metrics: {
          activeUsers: 10,
          activeWorkflows: 5,
          auditEvents: 150,
          systemLoad: 0.25
        }
      };
      
      res.json(health);
    } catch (error) {
      console.error('Error checking enterprise health:', error);
      res.status(500).json({ error: 'Failed to check enterprise health' });
    }
  });

  // Enterprise Analytics
  app.get('/api/enterprise/analytics', async (req: any, res: any) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const analytics = {
        workflowStats: workflowEngine.getExecutionStats(),
        auditStats: await auditService.getAuditStatistics({ start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() }),
        userActivity: {
          totalUsers: 10,
          activeUsers: 8,
          newUsers: 2
        },
        systemPerformance: {
          avgResponseTime: 120,
          errorRate: 0.01,
          uptime: 99.9
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching enterprise analytics:', error);
      res.status(500).json({ error: 'Failed to fetch enterprise analytics' });
    }
  });

  // ========== END PHASE 5 ROUTES ==========

  // Debug endpoint to test Phase 5 routes
  app.get('/api/test-phase5-debug', async (req: any, res: any) => {
    console.log('=== DEBUG ENDPOINT REACHED ===');
    console.log('Phase 5 debug endpoint reached');
    console.log('Session:', req.session);
    console.log('Headers:', req.headers);
    res.json({ 
      message: 'Phase 5 debug endpoint is working',
      hasSession: !!req.session,
      userId: req.session?.userId,
      timestamp: new Date().toISOString()
    });
  });

  // Test endpoint for Phase 5 routes
  app.get('/api/test-phase5', async (req: any, res: any) => {
    console.log('Test endpoint reached!');
    res.json({ message: 'Phase 5 routes are working', timestamp: new Date().toISOString() });
  });

  console.log('Phase 5 routes registered successfully');
  console.log('=== ROUTES REGISTRATION COMPLETE ===');
  console.log('=== ALL API ROUTES SHOULD NOW BE AVAILABLE ===');
  
  // Note: We don't create or return a server here - the main server handles that
  console.log('Route registration completed, returning to main server');
}