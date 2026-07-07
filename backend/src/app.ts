import express from "express";
import fs from "fs";
import path from "path";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

  // Handle both JSON and text/plain (for sendBeacon) content types
  app.use(express.json());
  app.use(express.text({ type: ["text/plain", "application/json"] }));
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
