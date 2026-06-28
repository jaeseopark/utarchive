import http from "http";
import { createApp } from "./app";
import { createWebSocketServer } from "./ws";
import { config } from "./config";

const app = createApp();
const server = http.createServer(app);
createWebSocketServer(server);

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT}`);
});
