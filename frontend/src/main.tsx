import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { handleWebSocketMessage } from "./hooks/useWebSocketIntegration";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <WebSocketProvider onMessage={handleWebSocketMessage}>
          <App />
        </WebSocketProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
