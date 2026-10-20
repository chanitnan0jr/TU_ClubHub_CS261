import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../features/auth/AuthContext";
import LoadingScreen from "./LoadingScreen";

// Sends visitors without a session to /login, then back to the page they asked for.
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
