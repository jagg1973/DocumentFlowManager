import express, { type Express } from "express";
import path from "path";

export function serveStatic(app: Express) {
  // Serve static files from the built client directory
  const clientDistPath = path.resolve(process.cwd(), "dist/public");
  console.log(`Serving static files from: ${clientDistPath}`);
  
  app.use(express.static(clientDistPath));
  
  // Serve the index.html for any non-API routes (SPA fallback)
  app.get("*", (req, res) => {
    // Handle API routes with 404
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    
    // For all other routes, serve the SPA
    const indexPath = path.join(clientDistPath, "index.html");
    console.log(`Serving SPA for route: ${req.path}`);
    res.sendFile(indexPath);
  });
}
