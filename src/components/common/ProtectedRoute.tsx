import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const { session, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <AppLoader fullScreen label="Loading workspace" />;
  }

  if (!session) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
