import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { WorkspaceLayout } from "../pages/WorkspaceLayout/WorkspaceLayout";
import { MatchesPage } from "../pages/MatchesPage/MatchesPage";
import { OrganizationPage } from "../pages/OrganizationPage/OrganizationPage";

type AppRouterProps = {
  authLoading: boolean;
  isConnected: boolean;
  hasSupabase: boolean;
  loginPage: ReactNode;
  consentPage: ReactNode;
};

function RouteLoading() {
  return (
    <div
      className="grid min-h-svh place-items-center text-sm text-(--text-secondary)"
      role="status"
    >
      Chargement de votre espace…
    </div>
  );
}

export function AppRouter({
  authLoading,
  isConnected,
  hasSupabase,
  loginPage,
  consentPage,
}: AppRouterProps) {
  const routeLoading = <RouteLoading />;

  return (
    <Routes>
      <Route
        path="/"
        element={
          authLoading ? (
            routeLoading
          ) : isConnected ? (
            <Navigate to="/app/matches" replace />
          ) : (
            loginPage
          )
        }
      />
      <Route
        path="/app"
        element={
          authLoading ? (
            routeLoading
          ) : isConnected ? (
            <WorkspaceLayout />
          ) : (
            <Navigate to="/" replace />
          )
        }
      >
        <Route index element={<Navigate to="matches" replace />} />
        <Route path="matches" element={<MatchesPage />} />
        <Route path="organizations" element={<OrganizationPage />} />
        <Route path="*" element={<Navigate to="matches" replace />} />
      </Route>
      <Route
        path="/oauth/consent"
        element={authLoading && hasSupabase ? routeLoading : consentPage}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
