import { createContext, useContext, type ReactNode } from "react";
import { useAppInitialization } from "../hooks/useAppInitialization";

interface InitializationContextType {
  initialized: boolean;
}

const InitializationContext = createContext<InitializationContextType | null>(null);

export function InitializationProvider({ children }: { children: ReactNode }) {
  const { initialized } = useAppInitialization();

  return (
    <InitializationContext.Provider value={{ initialized }}>
      {children}
    </InitializationContext.Provider>
  );
}

export function useInitialization() {
  const context = useContext(InitializationContext);
  if (!context) {
    throw new Error("useInitialization must be used within InitializationProvider");
  }
  return context;
}
