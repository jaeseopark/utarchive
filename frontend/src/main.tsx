import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { SessionProvider } from "./context/SessionContext";
import { InitializationProvider } from "./context/InitializationContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { handleWebSocketMessage } from "./hooks/useWebSocketIntegration";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <InitializationProvider>
          <WebSocketProvider onMessage={handleWebSocketMessage}>
            <App />
          </WebSocketProvider>
        </InitializationProvider>
      </SessionProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
