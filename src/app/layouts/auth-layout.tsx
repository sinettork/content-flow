import { Outlet, Navigate, useLocation } from "react-router-dom";

import { AppLoader } from "@/components/common/AppLoader";
import { useAuthStore } from "@/stores/auth-store";

export function AuthLayout() {
  const { session, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <AppLoader fullScreen label="Checking session" />;
  }

  // A recovery link establishes a short-lived authenticated session before the
  // user can choose a new password.
  if (session && location.pathname !== "/auth/update-password") {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.08),_transparent_42%)]" />
      <div className="relative w-full max-w-[420px]">
        <Outlet />
      </div>
    </div>
  );
}
