import { type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../context/SessionContext";
import { useInitialization } from "../context/InitializationContext";

export default function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, isLoading: authLoading } = useSession();
  const { initialized } = useInitialization();
  const location = useLocation();

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-700">
        Loading auth...
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Show loading screen while initializing app data
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-700">
        Initializing app data...
      </div>
    );
  }

  return <>{children}</>;
}
