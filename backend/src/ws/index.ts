import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { URL } from "url";
import { verifyJwt } from "../lib/jwt";
import {
  AuthenticatedWebSocket,
  WebSocketMessage,
  PingMessage,
  PongMessage,
  ConnectedMessage,
  ErrorMessage,
} from "../types/websocket";
import { logConnection, logMessageSend, logError, logBroadcast } from "../lib/webSocketLogger";

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 5000; // 5 seconds

export const createWebSocketServer = (server: http.Server) => {
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade HTTP connections to WebSocket with token validation
  server.on("upgrade", (request, socket, head) => {
    // Only upgrade /ws requests
    if (request.url?.startsWith("/ws")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      try {
        const payload = verifyJwt(token);

        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          const authWs = ws as AuthenticatedWebSocket;
          authWs.userId = payload.sub;
          authWs.isAlive = true;
          wss.emit("connection", authWs, request);
        });
      } catch (err) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
      }
    } else {
      socket.destroy();
    }
  });

  // Connection handler
  wss.on("connection", (socket: AuthenticatedWebSocket) => {
    console.log(
      `[WebSocket] Client connected: ${socket.userId}`
    );
    logConnection(socket.userId || "unknown", "connected");

    // Send connection confirmation
    const connectedMsg: ConnectedMessage = {
      type: "CONNECTED",
      timestamp: Date.now(),
    };
    socket.send(JSON.stringify(connectedMsg));
    logMessageSend(socket.userId || "unknown", "CONNECTED");

    // Set up heartbeat
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    // Message handler
    socket.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;

        if (message.type === "PING") {
          const pongMsg: PongMessage = {
            type: "PONG",
            timestamp: Date.now(),
          };
          socket.send(JSON.stringify(pongMsg));
        }
      } catch (err) {
        console.error("[WebSocket] Failed to parse message:", err);
        const errorMsg: ErrorMessage = {
          type: "ERROR",
          timestamp: Date.now(),
          error: "Invalid message format",
        };
        socket.send(JSON.stringify(errorMsg));
      }
    });

    // Error handler
    socket.on("error", (err) => {
      console.error(
        `[WebSocket] Client error (${socket.userId}):`,
        err
      );
      logError(socket.userId || "unknown", err);
    });

    // Close handler
    socket.on("close", () => {
      console.log(
        `[WebSocket] Client disconnected: ${socket.userId}`
      );
      logConnection(socket.userId || "unknown", "disconnected");
    });
  });

  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((socket: WebSocket) => {
      const authWs = socket as AuthenticatedWebSocket;

      if (authWs.isAlive === false) {
        console.log(
          `[WebSocket] Terminating unresponsive client: ${authWs.userId}`
        );
        authWs.terminate();
        return;
      }

      authWs.isAlive = false;
      authWs.ping();
    });
  }, HEARTBEAT_INTERVAL);

  // Cleanup on server close
  server.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
};

/**
 * Broadcast a WebSocket message to all connected clients
 */
export const broadcastMessage = (
  wss: WebSocketServer,
  message: WebSocketMessage,
  excludeSocketId?: string
) => {
  const payload = JSON.stringify(message);
  let clientCount = 0;

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      (!excludeSocketId || (client as AuthenticatedWebSocket).userId !== excludeSocketId)
    ) {
      client.send(payload);
      clientCount++;
    }
  });

  // Log the broadcast
  logBroadcast(excludeSocketId, message, clientCount);
};

/**
 * Broadcast to a specific client by user ID
 */
export const sendToClient = (
  wss: WebSocketServer,
  userId: string,
  message: WebSocketMessage
) => {
  const payload = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      (client as AuthenticatedWebSocket).userId === userId
    ) {
      client.send(payload);
    }
  });
};
