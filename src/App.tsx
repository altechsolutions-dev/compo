import { useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { OAuthConsentView } from "./components/OAuthConsentView/OAuthConsentView";
import { AuthProvider } from "./hooks/useAuth/AuthProvider";
import { useAuth } from "./hooks/useAuth/useAuth";
import { useOAuthConsent } from "./hooks/useOAuthConsent/useOAuthConsent";
import { ConnectedApp } from "./pages/ConnectedApp/ConnectedApp";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { supabase } from "./lib/supabase/supabase";
import type { DialogKind } from "./types";
import "./App.css";

function App() {
  const location = useLocation();
  const isOAuthConsentRoute = location.pathname === "/oauth/consent";
  const authorizationId = new URLSearchParams(location.search).get(
    "authorization_id",
  );
  const [modal, setModal] = useState<DialogKind | null>(() => {
    const hasInvite = new URLSearchParams(window.location.search).has("invite");
    return hasInvite && !supabase ? "code" : null;
  });
  const auth = useAuth({
    onCreateOrganizationIntent: () => setModal("organization"),
  });
  const {
    authMode,
    setAuthMode,
    authNotice,
    setAuthNotice,
    authNoticeKind,
    setAuthNoticeKind,
    authSubmitting,
    session,
    authLoading,
    signInWithGoogle,
    submitAuth,
  } = auth;
  const {
    consent,
    error: consentError,
    submitting: consentSubmitting,
    loading: consentLoading,
    routeError: consentRouteError,
    requestedScopes,
    decide: decideConsent,
  } = useOAuthConsent({
    authorizationId,
    enabled: isOAuthConsentRoute,
    authLoading,
    session,
  });

  const loginPage = authMode ? (
    <LoginPage
      authMode={authMode}
      authSubmitting={authSubmitting}
      authNotice={authNotice}
      authNoticeKind={authNoticeKind}
      onAuthModeChange={(mode) => {
        setAuthMode(mode);
        if (mode === "signup") setAuthNoticeKind("success");
      }}
      onClearNotice={() => setAuthNotice("")}
      onSubmit={submitAuth}
      onSignInWithGoogle={() => void signInWithGoogle()}
    />
  ) : null;

  const consentPage =
    !authorizationId || !supabase || session ? (
      <OAuthConsentView
        authorizationId={authorizationId}
        hasSupabase={Boolean(supabase)}
        consent={consent}
        loading={consentLoading}
        submitting={consentSubmitting}
        error={consentError}
        routeError={consentRouteError}
        requestedScopes={requestedScopes}
        onDecision={(approved) => void decideConsent(approved)}
      />
    ) : (
      loginPage
    );

  const routeLoading = (
    <div
      className="grid min-h-svh place-items-center text-sm text-(--text-secondary)"
      role="status"
    >
      Chargement de votre espace…
    </div>
  );
  const isConnected = Boolean(session) && authMode !== "update-password";
  return (
    <AuthProvider value={auth}>
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
        <Route path="/app" element={<Navigate to="/app/matches" replace />} />
        <Route
          path="/app/*"
          element={
            authLoading ? (
              routeLoading
            ) : isConnected ? (
              <ConnectedApp modal={modal} setModal={setModal} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/oauth/consent"
          element={authLoading && supabase ? routeLoading : consentPage}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
