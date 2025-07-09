import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import http from "http";
import { Server } from "socket.io";
import { pool } from "./db";
import { registerRoutes } from "./routes";

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

registerRoutes(app);

// Environment-specific setup with proper error handling
async function setupEnvironment() {
  try {
    if (process.env.NODE_ENV === "development") {
      const { setupVite, log } = await import("./vite.js");
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
    // Validate environment before starting
    if (!(await validateEnvironment())) {
      process.exit(1);
    }

    // Setup environment-specific middleware
    await setupEnvironment();

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
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
startServer();