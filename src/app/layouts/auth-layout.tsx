import { Outlet, Navigate } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { useAuthStore } from "@/stores/auth-store";

export function AuthLayout() {
  const { session, loading } = useAuthStore();

  if (loading) {
    return <AppLoader fullScreen label="Checking session" />;
  }
  if (session) return <Navigate to="/app/dashboard" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4">
      <div className="w-full max-w-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
