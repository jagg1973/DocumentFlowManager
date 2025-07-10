import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

const app = express();

// Session configuration with memory store (suitable for MySQL setup)
const MemorySessionStore = MemoryStore(session);

console.log('Setting up session middleware...');
app.use(session({
  store: new MemorySessionStore({
    checkPeriod: 86400000 // Prune expired entries every 24h
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  },
}));
console.log('Session middleware setup complete');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.use((req, res, next) => {
  // Log incoming requests
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

app.use(express.static("dist/public"));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

registerRoutes(app);

if (app.get("env") === "development") {
  setupVite(app);
} else {
  serveStatic(app);
}

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    pool.end();
    process.exit(0);
  });
});
