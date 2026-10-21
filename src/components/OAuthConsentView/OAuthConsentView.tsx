import logo from "../../assets/logo.png";
import type { OAuthConsentDetails } from "../../types";
import "./OAuthConsentView.css";

export type OAuthConsentViewProps = {
  authorizationId: string | null;
  hasSupabase: boolean;
  consent: OAuthConsentDetails | null;
  loading: boolean;
  submitting: boolean;
  error: string;
  routeError: string;
  requestedScopes: string[];
  onDecision: (approved: boolean) => void;
};

const scopeLabels: Record<string, string> = {
  openid: "Vous identifier",
  email: "Consulter votre adresse e-mail",
  profile: "Consulter votre profil",
};

export function OAuthConsentView({
  authorizationId,
  hasSupabase,
  consent,
  loading,
  submitting,
  error,
  routeError,
  requestedScopes,
  onDecision,
}: OAuthConsentViewProps) {
  return (
    <main className="oauth-consent-view grid min-h-svh place-items-center bg-(--bg-main) px-5 py-10 text-(--text-primary)">
      <section className="oauth-consent-view__panel w-full max-w-lg rounded-lg border border-(--border-neutral) bg-[#242630] p-7 shadow-2xl max-[500px]:p-5">
        <img className="mb-8 h-auto w-37.5" src={logo} alt="Compo" />
        <h1 className="mb-2 text-2xl font-semibold text-white">
          Autorisation de connexion
        </h1>
        {!authorizationId || !hasSupabase ? (
          <p className="text-sm leading-relaxed text-(--text-secondary)">
            {routeError}
          </p>
        ) : loading ? (
          <p className="text-sm text-(--text-secondary)">
            Chargement de la demande d’autorisation…
          </p>
        ) : consent ? (
          <>
            <p className="mb-5 text-sm leading-relaxed text-(--text-secondary)">
              <strong className="text-white">{consent.client.name}</strong>{" "}
              souhaite accéder à votre compte Compo ({consent.user.email}).
            </p>
            <div className="oauth-consent-view__scopes mb-6 rounded-md bg-[#1e2029] p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-(--text-secondary)">
                Accès demandé
              </p>
              <ul className="m-0 grid gap-2 pl-5 text-sm text-white">
                {requestedScopes.map((scope) => (
                  <li key={scope}>{scopeLabels[scope] ?? scope}</li>
                ))}
              </ul>
            </div>
            {error && (
              <p className="mb-4 text-sm text-(--team-a-red)" role="alert">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                className="oauth-consent-view__button oauth-consent-view__button--secondary"
                disabled={submitting}
                onClick={() => onDecision(false)}
                type="button"
              >
                Refuser
              </button>
              <button
                className="oauth-consent-view__button oauth-consent-view__button--primary"
                disabled={submitting}
                onClick={() => onDecision(true)}
                type="button"
              >
                {submitting ? "Patientez…" : "Autoriser"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-(--text-secondary)">
            {error || "Chargement de la demande…"}
          </p>
        )}
      </section>
    </main>
  );
}
