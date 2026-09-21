import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AuthLayout } from "@/app/layouts/auth-layout";
import { DashboardLayout } from "@/app/layouts/dashboard-layout";
import { AppLoader } from "@/components/common/AppLoader";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { StubPage } from "@/components/common/StubPage";

// Lazy-loaded feature pages for code splitting
const RegisterPage = lazy(() => import("@/features/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })));
const SignInPage = lazy(() => import("@/features/auth/SignInPage").then((m) => ({ default: m.SignInPage })));
const ForgotPasswordPage = lazy(() => import("@/features/auth/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = lazy(() => import("@/features/auth/UpdatePasswordPage").then((m) => ({ default: m.UpdatePasswordPage })));
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const ContentListPage = lazy(() => import("@/features/content/ContentListPage").then((m) => ({ default: m.ContentListPage })));
const ContentDetailPage = lazy(() => import("@/features/content/ContentDetailPage").then((m) => ({ default: m.ContentDetailPage })));
const ContentFormPage = lazy(() => import("@/features/content/ContentFormPage").then((m) => ({ default: m.ContentFormPage })));
const BoardPage = lazy(() => import("@/features/board/BoardPage").then((m) => ({ default: m.BoardPage })));
const CalendarPage = lazy(() => import("@/features/calendar/CalendarPage").then((m) => ({ default: m.CalendarPage })));
const CampaignsPage = lazy(() => import("@/features/campaigns/CampaignsPage").then((m) => ({ default: m.CampaignsPage })));
const CampaignDetailPage = lazy(() => import("@/features/campaigns/CampaignDetailPage").then((m) => ({ default: m.CampaignDetailPage })));
const TeamPage = lazy(() => import("@/features/team/TeamPage").then((m) => ({ default: m.TeamPage })));
const ReportsPage = lazy(() => import("@/features/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const ProfilePage = lazy(() => import("@/features/profile/ProfilePage").then((m) => ({ default: m.ProfilePage })));
const NotificationsPage = lazy(() => import("@/features/notifications/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const AssetsPage = lazy(() => import("@/features/assets/AssetsPage").then((m) => ({ default: m.AssetsPage })));
const OperationsPage = lazy(() => import("@/features/operations/OperationsPage").then((m) => ({ default: m.OperationsPage })));

function PageLoader() {
  return <AppLoader label="Loading" delay={900} />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

        <Route path="/auth" element={<AuthLayout />}>
          <Route index element={<Navigate to="sign-in" replace />} />
          <Route path="sign-in" element={<SignInPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="update-password" element={<UpdatePasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="content" element={<ContentListPage />} />
            <Route path="content/new" element={<ContentFormPage />} />
            <Route path="content/:id" element={<ContentDetailPage />} />
            <Route path="content/:id/edit" element={<ContentFormPage />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="assets" element={<AssetsPage />} />
            <Route path="operations" element={<OperationsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        <Route path="*" element={<StubPage title="404" description="Page not found." />} />
      </Routes>
    </Suspense>
  );
}
