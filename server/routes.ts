import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertProjectSchema, 
  insertTaskSchema, 
  insertProjectMemberSchema,
  insertTaskItemSchema,
  insertTaskReviewSchema,
  insertGracePeriodRequestSchema 
} from "@shared/schema";
import { z } from "zod";
import ExcelJS from "exceljs";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjectsForUser(userId);
      
      // Calculate project stats
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          const tasks = await storage.getTasksForProject(project.id);
          const members = await storage.getProjectMembers(project.id);
          
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(t => t.status === 'Completed').length;
          const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
          const overdueTasks = tasks.filter(t => {
            if (!t.endDate) return false;
            const endDate = new Date(t.endDate);
            const today = new Date();
            return endDate < today && t.status !== 'Completed';
          }).length;
          
          const averageProgress = totalTasks > 0 
            ? Math.round(tasks.reduce((sum, task) => sum + (task.progress || 0), 0) / totalTasks)
            : 0;

          return {
            ...project,
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            averageProgress,
            members: members.slice(0, 4), // First 4 members for avatar display
          };
        })
      );
      
      res.json(projectsWithStats);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check access
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  // Task routes
  app.get('/api/projects/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check access
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tasks = await storage.getTasksForProject(projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/projects/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check edit access
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess || access.permission !== 'edit') {
        return res.status(403).json({ message: "Edit access required" });
      }
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        projectId,
      });
      
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.put('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      // Get task to check project access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check edit access
      const access = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!access.hasAccess || access.permission !== 'edit') {
        return res.status(403).json({ message: "Edit access required" });
      }
      
      const updateData = insertTaskSchema.partial().parse(req.body);
      const updatedTask = await storage.updateTask(taskId, updateData);
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      // Get task to check project access
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Check edit access
      const access = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!access.hasAccess || access.permission !== 'edit') {
        return res.status(403).json({ message: "Edit access required" });
      }
      
      await storage.deleteTask(taskId);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Project members routes
  app.get('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check access
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post('/api/projects/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check if user is project owner
      const project = await storage.getProject(projectId);
      if (!project || project.ownerId !== userId) {
        return res.status(403).json({ message: "Only project owner can add members" });
      }
      
      const memberData = insertProjectMemberSchema.parse({
        ...req.body,
        projectId,
      });
      
      const member = await storage.addProjectMember(memberData);
      res.json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  // Excel export route
  app.get('/api/projects/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.id);
      
      // Check access
      const access = await storage.checkUserProjectAccess(userId, projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const project = await storage.getProject(projectId);
      const tasks = await storage.getTasksForProject(projectId);
      const members = await storage.getProjectMembers(projectId);
      
      // Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('SEO Project Timeline');
      
      // Add headers
      worksheet.columns = [
        { header: 'WBS', key: 'id', width: 10 },
        { header: 'Phase', key: 'phase', width: 15 },
        { header: 'Pillar', key: 'pillar', width: 20 },
        { header: 'Task Name', key: 'taskName', width: 30 },
        { header: 'Assigned To', key: 'assignedTo', width: 20 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Progress', key: 'progress', width: 10 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      
      // Add data
      tasks.forEach(task => {
        const assignedUser = members.find(m => m.userId === task.assignedToId);
        worksheet.addRow({
          id: task.id,
          phase: task.phase,
          pillar: task.pillar,
          taskName: task.taskName,
          assignedTo: assignedUser ? `${assignedUser.user.firstName} ${assignedUser.user.lastName}` : 'Unassigned',
          startDate: task.startDate,
          endDate: task.endDate,
          progress: `${task.progress}%`,
          status: task.status,
        });
      });
      
      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' }
      };
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${project?.projectName || 'SEO-Timeline'}.xlsx"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      res.status(500).json({ message: "Failed to export to Excel" });
    }
  });

  // User search route
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      const query = req.query.q as string;
      const users = await storage.searchUsers(query);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Task Items routes
  app.get('/api/tasks/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const access = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const items = await storage.getTaskItems(taskId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching task items:", error);
      res.status(500).json({ message: "Failed to fetch task items" });
    }
  });

  app.post('/api/tasks/:id/items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const access = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!access.hasAccess || access.permission !== 'edit') {
        return res.status(403).json({ message: "Edit permission required" });
      }
      
      const itemData = insertTaskItemSchema.parse({
        ...req.body,
        taskId,
      });
      
      const item = await storage.createTaskItem(itemData);
      res.json(item);
    } catch (error) {
      console.error("Error creating task item:", error);
      res.status(500).json({ message: "Failed to create task item" });
    }
  });

  app.patch('/api/task-items/:id', isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const updateData = req.body;
      const updatedItem = await storage.updateTaskItem(itemId, updateData);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Task item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating task item:", error);
      res.status(500).json({ message: "Failed to update task item" });
    }
  });

  // Task Reviews routes
  app.get('/api/tasks/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const access = await storage.checkUserProjectAccess(userId, task.projectId);
      if (!access.hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const reviews = await storage.getTaskReviews(taskId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching task reviews:", error);
      res.status(500).json({ message: "Failed to fetch task reviews" });
    }
  });

  app.post('/api/tasks/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskId = parseInt(req.params.id);
      
      const reviewData = insertTaskReviewSchema.parse({
        ...req.body,
        taskId,
        reviewerId: userId,
      });
      
      const review = await storage.createTaskReview(reviewData);
      
      // Update member authority based on review
      await storage.updateMemberAuthority(
        reviewData.revieweeId,
        `Review received: ${reviewData.reviewType}`,
        taskId,
        review.id
      );
      
      res.json(review);
    } catch (error) {
      console.error("Error creating task review:", error);
      res.status(500).json({ message: "Failed to create task review" });
    }
  });

  // Member Authority routes
  app.get('/api/users/:id/authority', isAuthenticated, async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const score = await storage.calculateMemberAuthorityScore(targetUserId);
      res.json({ userId: targetUserId, authorityScore: score });
    } catch (error) {
      console.error("Error calculating authority score:", error);
      res.status(500).json({ message: "Failed to calculate authority score" });
    }
  });

  // Grace Period Request routes
  app.post('/api/grace-period-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const requestData = insertGracePeriodRequestSchema.parse({
        ...req.body,
        userId,
      });
      
      const request = await storage.createGracePeriodRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Error creating grace period request:", error);
      res.status(500).json({ message: "Failed to create grace period request" });
    }
  });

  app.get('/api/grace-period-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getGracePeriodRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching grace period requests:", error);
      res.status(500).json({ message: "Failed to fetch grace period requests" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
