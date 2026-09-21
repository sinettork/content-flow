import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { StubPage } from "@/components/common/StubPage";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const { session, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <AppLoader fullScreen label="Loading workspace" />;
  }

  if (!session) {
    return <Navigate to="/auth/sign-in" replace state={{ from: location }} />;
  }

  if (!profile?.workspace_id) {
    return <StubPage title="Workspace access required" description="Your account is not an active member of a workspace. Ask a workspace administrator to send or restore your invitation." />;
  }

  return <Outlet />;
}
