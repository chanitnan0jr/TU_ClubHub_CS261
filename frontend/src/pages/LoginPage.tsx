import { Navigate, useSearchParams } from "react-router";
import LoadingScreen from "../app/LoadingScreen";
import { safeRedirectPath } from "../app/redirect";
import { useAuth } from "../features/auth/AuthContext";
import Login from "../features/auth/Login";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [params] = useSearchParams();

  if (isLoading) return <LoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to={safeRedirectPath(params.get("next"))} replace />;
  }

  return <Login />;
}
