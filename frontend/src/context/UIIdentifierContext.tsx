import { createContext, type PropsWithChildren, useContext, useMemo } from "react";
import { setCurrentOriginId } from "../api/client";

export interface UIIdentifierContextValue {
  originId: string;
}

const UIIdentifierContext = createContext<UIIdentifierContextValue | undefined>(undefined);

/**
 * Generates a UUID v4
 */
function generateUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Provider for UI identifier
 * Generates a unique identifier for this UI instance at startup
 */
export function UIIdentifierProvider({ children }: PropsWithChildren) {
  // Generate origin ID once on mount and keep it for the lifetime of the app
  const originId = useMemo(() => {
    const id = generateUUID();
    // Set the origin ID in the API client so it can be included in request headers
    setCurrentOriginId(id);
    console.log(`[UI] Initialized with originId: ${id}`);
    return id;
  }, []);

  const value = useMemo(() => ({ originId }), [originId]);

  return <UIIdentifierContext.Provider value={value}>{children}</UIIdentifierContext.Provider>;
}

export function useUIIdentifier() {
  const context = useContext(UIIdentifierContext);
  if (!context) {
    throw new Error("useUIIdentifier must be used within a UIIdentifierProvider");
  }
  return context;
}
