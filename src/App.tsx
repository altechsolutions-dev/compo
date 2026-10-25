import { useLocation } from "react-router-dom";
import { OAuthConsentView } from "./components/OAuthConsentView/OAuthConsentView";
import { AuthProvider } from "./hooks/useAuth/AuthProvider";
import { useAuth } from "./hooks/useAuth/useAuth";
import { useOAuthConsent } from "./hooks/useOAuthConsent/useOAuthConsent";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { supabase } from "./lib/supabase/supabase";
import { AppRouter } from "./router/AppRouter";

function App() {
  const location = useLocation();
  const isOAuthConsentRoute = location.pathname === "/oauth/consent";
  const authorizationId = new URLSearchParams(location.search).get(
    "authorization_id",
  );
  const auth = useAuth();
  const {
    authMode,
    setAuthMode,
    rememberSession,
    setRememberSession,
    authNotice,
    setAuthNotice,
    authNoticeKind,
    setAuthNoticeKind,
    authSubmitting,
    signInWithPasskey,
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
      rememberSession={rememberSession}
      onAuthModeChange={(mode) => {
        setAuthMode(mode);
        if (mode === "signup") setAuthNoticeKind("success");
      }}
      onClearNotice={() => setAuthNotice("")}
      onRememberSessionChange={setRememberSession}
      onSubmit={submitAuth}
      onSignInWithGoogle={() => void signInWithGoogle()}
      onSignInWithPasskey={() => void signInWithPasskey()}
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

  const isConnected = Boolean(session) && authMode !== "update-password";
  return (
    <AuthProvider value={auth}>
      <AppRouter
        authLoading={authLoading}
        isConnected={isConnected}
        hasSupabase={Boolean(supabase)}
        loginPage={loginPage}
        consentPage={consentPage}
      />
    </AuthProvider>
  );
}

export default App;
