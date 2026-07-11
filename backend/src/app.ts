import express from "express";
import fs from "fs";
import path from "path";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";

export const createApp = () => {
  const app = express();

  // Disable ETag generation to prevent 304 responses
  app.disable("etag");

  // ✅ CRITICAL FIX: Add explicit limits to body parsers to prevent interference with multipart uploads
  // Default limits (100 KB) can cause issues with larger form data
  app.use(express.json({ limit: "100mb" }));
  app.use(express.text({ type: ["text/plain", "application/json"], limit: "100mb" }));

  // Add request ID middleware
  app.use(requestIdMiddleware);

  // Disable caching for all API responses to prevent 304 Not Modified
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-cache, no-store, must-revalidate, private");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });

  app.use(routes);

  // Only serve static frontend in production
  if (process.env.NODE_ENV === "production") {
    const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
    if (fs.existsSync(frontendDistPath)) {
      app.use(express.static(frontendDistPath));
      app.get(/.*/, (req, res, next) => {
        if (req.method !== "GET") {
          return next();
        }

        res.sendFile(path.join(frontendDistPath, "index.html"), (err) => {
          if (err) {
            next(err);
          }
        });
      });
    }
  }

  app.use(errorHandler);

  return app;
};
