import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import http from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { workflowEngine } from "./workflow-engine";
import { auditService } from "./audit-service";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.set('io', io);

// Environment validation function
async function validateEnvironment() {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    
    // Validate required environment variables for production
    if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET is required in production');
    }
    
    return true;
  } catch (error) {
    console.error('Environment validation failed:', error);
    return false;
  }
}

// Session configuration with default memory store
console.log('Setting up session middleware...');
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: true,
  saveUninitialized: true,
  rolling: true,
  cookie: {
    secure: false, // Set to false for local development (even in production mode)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
console.log('Session middleware setup complete');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use((req, res, next) => {
  // Log incoming requests
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// Environment-specific setup with proper error handling
async function setupEnvironment() {
  try {
    if (process.env.NODE_ENV === "development") {
      const { setupVite, log } = await import("./vite");
      await setupVite(app, server);

      app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse: Record<string, any> | undefined = undefined;

        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
          capturedJsonResponse = bodyJson;
          return originalResJson.apply(res, [bodyJson, ...args]);
        };

        res.on("finish", () => {
          const duration = Date.now() - start;
          if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
              logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 80) {
              logLine = logLine.slice(0, 79) + "…";
            }

            log(logLine);
          }
        });

        next();
      });
    } else {
      const { serveStatic } = await import("./static");
      serveStatic(app);
    }
  } catch (error) {
    console.error('Failed to setup environment-specific middleware:', error);
    throw error;
  }
}

// Global error handler middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown for Docker
const gracefulShutdown = () => {
  console.log('Received shutdown signal. Gracefully shutting down...');
  server.close(async (err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    try {
      // Stop workflow engine
      await workflowEngine.stop();
      console.log('Workflow engine stopped');
      
      // Close database connections
      await pool.end();
      console.log('Database connections closed');
    } catch (dbError) {
      console.error('Error closing database connections:', dbError);
    }
    
    console.log('Server closed successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals for Docker
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Main startup function
async function startServer() {
  try {
    console.log('=== STARTING SERVER FUNCTION ===');
    
    // Validate environment before starting
    if (!(await validateEnvironment())) {
      console.log('Environment validation failed, exiting...');
      process.exit(1);
    }
    console.log('Environment validation passed');

    // Initialize enterprise services
    console.log('Initializing enterprise services...');
    
    // Start workflow engine
    await workflowEngine.start();
    console.log('Workflow engine started');

    // Initialize audit service
    console.log('Audit service initialized');

    // Register API routes before setting up environment-specific middleware
    console.log('About to call registerRoutes...');
    
    // TEST: Add a simple route directly here to verify routing works
    app.get('/api/test-direct', (req, res) => {
      console.log('Direct test route called');
      res.json({ message: 'Direct route working', timestamp: new Date().toISOString() });
    });
    console.log('Direct test route registered');
    
    await registerRoutes(app);
    console.log('registerRoutes completed successfully');

    // Setup environment-specific middleware
    console.log('About to call setupEnvironment...');
    await setupEnvironment();
    console.log('setupEnvironment completed successfully');

    // NOTE: API routes are registered BEFORE static serving to ensure they take precedence

    // Socket.IO connection handling with enhanced room management
    io.on('connection', (socket: any) => {
      console.log('Client connected:', socket.id);
      
      // Join project room
      socket.on('join_project', (data: { projectId: number, userId: string }) => {
        const { projectId, userId } = data;
        const roomName = `project_${projectId}`;
        socket.join(roomName);
        socket.userId = userId;
        socket.projectId = projectId;
        console.log(`User ${userId} joined project room: ${roomName}`);
        
        // Log user activity
        auditService.logUserActivity(userId, 'join_project', 'project', { projectId });
      });

      // Handle task updates
      socket.on('task_updated', (data: any) => {
        const { taskId, projectId, changes, userId } = data;
        const roomName = `project_${projectId}`;
        
        // Broadcast to all users in the project room except sender
        socket.to(roomName).emit('task_updated', {
          taskId,
          changes,
          updatedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Log user activity
        auditService.logUserActivity(userId, 'task_updated', 'task', { taskId, changes });
        
        // Trigger workflow engine
        workflowEngine.emit('task_updated', { taskId, projectId, changes, userId });
      });

      // Handle new comments
      socket.on('comment_added', (data: any) => {
        const { taskId, projectId, comment, userId } = data;
        const roomName = `project_${projectId}`;
        
        socket.to(roomName).emit('comment_added', {
          taskId,
          comment,
          addedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Log user activity
        auditService.logUserActivity(userId, 'comment_added', 'task', { taskId, comment });
      });

      // Handle task status changes
      socket.on('task_status_changed', (data: any) => {
        const { taskId, projectId, oldStatus, newStatus, userId } = data;
        const roomName = `project_${projectId}`;
        
        socket.to(roomName).emit('task_status_changed', {
          taskId,
          oldStatus,
          newStatus,
          changedBy: userId,
          timestamp: new Date().toISOString()
        });

        // Log user activity
        auditService.logUserActivity(userId, 'task_status_changed', 'task', { taskId, oldStatus, newStatus });
        
        // Trigger workflow engine
        if (newStatus === 'Completed') {
          workflowEngine.emit('task_completed', { taskId, projectId, userId });
        }
      });

      // Handle typing indicators for comments
      socket.on('user_typing', (data: any) => {
        const { taskId, projectId, userId, isTyping } = data;
        const roomName = `project_${projectId}`;
        
        socket.to(roomName).emit('user_typing', {
          taskId,
          userId,
          isTyping,
          timestamp: new Date().toISOString()
        });
      });

      // Handle notifications
      socket.on('notification_sent', (data: any) => {
        const { recipientId, notification } = data;
        io.to(`user_${recipientId}`).emit('notification_received', notification);
      });

      // Join user-specific room for personal notifications
      socket.on('join_user_room', (data: { userId: string }) => {
        const { userId } = data;
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined personal notification room`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, () => {
      // In development, the vite logger is used
      if (process.env.NODE_ENV !== 'development') {
        console.log(`Server running on port ${PORT}`);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
console.log('=== ABOUT TO CALL startServer() ===');
startServer().then(() => {
  console.log('=== startServer() COMPLETED ===');
}).catch((error) => {
  console.error('=== startServer() ERROR ===', error);
});