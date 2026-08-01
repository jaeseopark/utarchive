import http from "http";
import { createApp } from "./app";
import { createWebSocketServer } from "./ws";
import { config } from "./config";
import { AudioIngestionService } from "./services/audioIngestion";

const app = createApp();
const server = http.createServer(app);
const wss = createWebSocketServer(server);

// Attach WebSocket server to app for access from routes
app.locals.wss = wss;

// Initialize audio ingestion service
// Watcher monitors /data/ingestion (read-only) and processes files to /data/audio
const audioIngestionService = new AudioIngestionService("/data/audio", wss);
audioIngestionService.start("/data/ingestion");
app.locals.audioIngestionService = audioIngestionService;

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);

  // Gracefully stop audio ingestion watcher
  audioIngestionService
    .stop()
    .catch((err) => {
      console.error("Error stopping audio ingestion service:", err);
    })
    .finally(() => {
      server.close((err) => {
        if (err) {
          console.error(err);
          process.exit(1);
        }
        process.exit(0);
      });
    });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT}`);
});
