import { WebSocketServer } from "ws";
import http from "http";

export const createWebSocketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket) => {
    socket.on("message", () => {
      // no-op placeholder for future message handling
    });
  });

  return wss;
};
