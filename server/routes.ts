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

  // Tasks endpoints
  app.get("/api/projects/:id/tasks", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, projectId);
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
        return res.status(403).json({ error: "Not authorized to comment on this task" });
      }
      
      const comment = await storage.createTaskComment({
        taskId,
        parentCommentId: parentCommentId || null,
        authorId: req.session.userId,
        content: content.trim(),
        commentType,
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

  app.put("/api/comments/:commentId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const commentId = parseInt(req.params.commentId);
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      
      // Get the existing comment to check ownership and access
      const comments = await storage.getTaskComments(0); // We'll need to modify this to get a single comment
      // For now, let's implement a basic version
      
      const updatedComment = await storage.updateTaskComment(commentId, {
        content: content.trim(),
        isEdited: true,
        editedAt: new Date(),
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

  app.delete("/api/comments/:commentId", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const commentId = parseInt(req.params.commentId);
      
      // TODO: Add ownership and access checks
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
        return res.status(403).json({ error: "Not authorized to upload attachments to this task" });
      }
      
      // Save file (you'll need to implement file storage)
      const storedFilename = `task_${taskId}_${Date.now()}_${file.originalname}`;
      const filePath = `/uploads/tasks/${storedFilename}`;
      
      const attachment = await storage.createTaskAttachment({
        taskId,
        uploadedBy: req.session.userId,
        originalFilename: file.originalname,
        storedFilename,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileExtension: file.originalname.split('.').pop() || '',
        attachmentType: file.mimetype.startsWith('image/') ? 'image' : 'file',
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
      if (!hasAccess.hasAccess) {
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
      if (!hasAccess.hasAccess) {
        return res.status(403).json({ error: "Not authorized to view task time entries" });
      }
      
      const timeEntries = await storage.getTimeEntries(taskId);
      res.json(timeEntries);
    } catch (error) {
      console.error(`Error fetching task time entries:`, error);
      res.status(500).json({ error: "Failed to fetch task time entries" });
    }
  });

  app.post("/api/tasks/:taskId/time-entries", async (req: any, res: any) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.taskId);
      const { startTime, endTime, durationMinutes, description, isBillable = false } = req.body;
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      // Check if user has access to this task's project
      const hasAccess = await storage.checkUserProjectAccess(req.session.userId, task.projectId);
      if (!hasAccess.hasAccess) {
        return res.status(403).json({ error: "Not authorized to log time for this task" });
      }
      
      const timeEntry = await storage.createTimeEntry({
        taskId,
        userId: req.session.userId,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        durationMinutes,
        description,
        isBillable,
      });
      
      // Log activity
      await storage.createTaskActivity({
        taskId,
        userId: req.session.userId,
        activityType: 'time_logged',
        description: `Logged ${durationMinutes || 'time'} minutes`,
      });
      
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error(`Error creating time entry:`, error);
      res.status(500).json({ error: "Failed to create time entry" });
    }
  });

  // Task Notifications endpoint
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
      if (!access.hasAccess) {
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

  // Initialize achievements
  storage.initializeAchievements().catch(console.error);

  const httpServer = createServer(app);
  return httpServer;
}