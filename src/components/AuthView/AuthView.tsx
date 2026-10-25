import type { FormEventHandler } from "react";
import { ArrowRight, Fingerprint } from "lucide-react";
import logo from "../../assets/logo.png";
import { Drawer } from "../Drawer/Drawer";
import { useDrawerTransition } from "../../hooks/useDrawerTransition/useDrawerTransition";
import type { AuthMode } from "../../types";
import "./AuthView.css";

export type AuthViewProps = {
  authMode: Exclude<AuthMode, null>;
  authSubmitting: boolean;
  authNotice: string;
  authNoticeKind: "error" | "success";
  rememberSession: boolean;
  onAuthModeChange: (mode: AuthMode) => void;
  onClearNotice: () => void;
  onRememberSessionChange: (remember: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onSignInWithGoogle: () => void;
  onSignInWithPasskey: () => void;
};

const authTitles: Record<Exclude<AuthMode, null>, string> = {
  login: "Connecte-toi",
  signup: "Crée ton compte",
  recovery: "Mot de passe oublié ?",
  "resend-confirmation": "Renvoyer le lien de confirmation",
  "update-password": "Choisis un nouveau mot de passe",
};

const authDescriptions: Record<Exclude<AuthMode, null>, string> = {
  login: "Retrouve tes prochains matchs et ton équipe.",
  signup: "Crée ton compte et retrouve ton équipe.",
  recovery: "Nous vous enverrons un lien de réinitialisation par e-mail.",
  "resend-confirmation": "Saisissez l’adresse utilisée à l’inscription.",
  "update-password":
    "Utilisez au moins 8 caractères pour votre nouveau mot de passe.",
};

const submitLabels: Record<Exclude<AuthMode, null>, string> = {
  login: "Se connecter",
  signup: "Créer mon compte",
  recovery: "Envoyer le lien",
  "resend-confirmation": "Renvoyer l’e-mail",
  "update-password": "Enregistrer le mot de passe",
};

export function AuthView({
  authMode,
  authSubmitting,
  authNotice,
  authNoticeKind,
  rememberSession,
  onAuthModeChange,
  onClearNotice,
  onRememberSessionChange,
  onSubmit,
  onSignInWithGoogle,
  onSignInWithPasskey,
}: AuthViewProps) {
  const drawer = useDrawerTransition(true);
  const isLoginOrSignup = authMode === "login" || authMode === "signup";
  const hasConfirmationError =
    authNoticeKind === "error" && authNotice.includes("lien de confirmation");

  return (
    <main className="auth-view relative isolate grid min-h-svh w-full place-items-center overflow-hidden bg-(--bg-main) text-(--text-primary)">
      <div className="landing-field-background" aria-hidden="true" />
      <div className="landing-vignette" />
      <section
        className="absolute inset-y-0 left-0 flex w-[40%] flex-col justify-center px-[clamp(28px,5vw,88px)] pr-8 text-white max-[900px]:hidden"
        aria-label="À propos de Compo"
      >
        <h1 className="absolute top-9 left-[clamp(28px,5vw,88px)] m-0">
          <img className="block h-auto w-37.5" src={logo} alt="Compo" />
        </h1>
        <div>
          <p className="mb-5 flex items-center gap-2 text-[9px] font-bold tracking-[0.16em] text-white [text-shadow:0_2px_12px_#05070d]">
            <span className="size-1.5 rounded-full bg-(--status-success)" />
            LE FOOT, SANS PRISE DE TÊTE
          </p>
          <h2 className="m-0 grid gap-0.5 font-sans text-[62px] font-bold leading-[0.98] text-white [text-shadow:0_2px_12px_#05070d] max-[1100px]:text-[46px]">
            <span>Joue,</span>
            <span>Vibre,</span>
            <span className="text-(--team-b-blue)">Recommence.</span>
          </h2>
          <p className="mt-6 max-w-70 text-sm leading-relaxed text-white [text-shadow:0_2px_12px_#05070d]">
            Crée ton équipe, trouve un terrain et rejoins la prochaine partie.
          </p>
        </div>
      </section>
      <Drawer
        mounted={drawer.mounted}
        open={drawer.open}
        onClose={() => {}}
        labelledBy="auth-title"
        panelClassName="auth-view__panel relative flex min-h-svh w-[60%] flex-col justify-center overflow-y-auto border-l border-[#3a3c47] bg-[#242630] px-[clamp(28px,7vw,112px)] py-12 text-(--text-primary) shadow-[-24px_0_80px_#0009] max-[700px]:w-full max-[700px]:border-l-0 max-[700px]:px-5.75 max-[700px]:py-6.75"
        backdropClassName="auth-view-drawer-backdrop z-3"
      >
        <section>
          <h1 className="auth-view__mobile-logo">
            <img className="block h-auto w-33" src={logo} alt="Compo" />
          </h1>
          <div className="mx-auto w-full max-w-140">
            {isLoginOrSignup && (
              <p className="drawer-eyebrow mb-2">
                {authMode === "login"
                  ? "CONTENT DE TE REVOIR"
                  : "REJOINS TON ÉQUIPE"}
              </p>
            )}
            <h2 className="drawer-title mb-1.5 text-white" id="auth-title">
              {authTitles[authMode]}
            </h2>
            <p className="mb-6 text-sm text-(--text-secondary)">
              {authDescriptions[authMode]}
            </p>
            {isLoginOrSignup && (
              <div
                className="mb-6 grid h-11 grid-cols-2 rounded-[5px] bg-[#1e2029] p-1"
                role="tablist"
                aria-label="Mode d’authentification"
              >
                <button
                  className={`cursor-pointer rounded-sm border-0 text-xs font-semibold transition-colors ${authMode === "login" ? "bg-[#343744] text-white shadow-sm" : "bg-transparent text-(--text-secondary) hover:text-white"}`}
                  onClick={() => {
                    onAuthModeChange("login");
                    onClearNotice();
                  }}
                  type="button"
                  role="tab"
                  aria-selected={authMode === "login"}
                >
                  Connexion
                </button>
                <button
                  className={`cursor-pointer rounded-sm border-0 text-xs font-semibold transition-colors ${authMode === "signup" ? "bg-[#343744] text-white shadow-sm" : "bg-transparent text-(--text-secondary) hover:text-white"}`}
                  onClick={() => {
                    onAuthModeChange("signup");
                    onClearNotice();
                  }}
                  type="button"
                  role="tab"
                  aria-selected={authMode === "signup"}
                >
                  Inscription
                </button>
              </div>
            )}
            <form className="auth-view__form" onSubmit={onSubmit}>
              {authMode === "signup" && (
                <label>
                  Pseudo de joueur
                  <input
                    autoComplete="nickname"
                    name="username"
                    placeholder="Votre pseudo de joueur"
                    required
                  />
                </label>
              )}
              {authMode !== "update-password" && (
                <label>
                  Adresse e-mail
                  <input
                    autoComplete="email"
                    name="identifier"
                    placeholder="joueur@exemple.fr"
                    required
                    type="email"
                  />
                </label>
              )}
              {authMode !== "recovery" &&
                authMode !== "resend-confirmation" && (
                  <label>
                    {authMode === "update-password"
                      ? "Nouveau mot de passe"
                      : "Mot de passe"}
                    <input
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      name="password"
                      placeholder={
                        authMode === "login"
                          ? "Ton mot de passe"
                          : "8 caractères minimum"
                      }
                      required
                      minLength={8}
                      type="password"
                    />
                  </label>
                )}
              {authMode === "login" && (
                <label className="auth-view__remember">
                  <input
                    checked={rememberSession}
                    onChange={(event) =>
                      onRememberSessionChange(event.currentTarget.checked)
                    }
                    type="checkbox"
                  />
                  Rester connecté sur cet appareil
                </label>
              )}
              {authMode === "login" && (
                <button
                  className="auth-view__recovery"
                  onClick={() => {
                    onAuthModeChange(
                      hasConfirmationError ? "resend-confirmation" : "recovery",
                    );
                    onClearNotice();
                  }}
                  type="button"
                >
                  {hasConfirmationError
                    ? "Renvoyer le lien de confirmation"
                    : "Mot de passe oublié ?"}
                </button>
              )}
              {authMode === "signup" && (
                <label>
                  Confirmer le mot de passe
                  <input
                    autoComplete="new-password"
                    name="password_confirmation"
                    placeholder="Retapez votre mot de passe"
                    required
                    minLength={8}
                    type="password"
                  />
                </label>
              )}
              <button
                className="auth-view__submit"
                disabled={authSubmitting}
                type="submit"
              >
                {authSubmitting ? (
                  "Patientez…"
                ) : (
                  <>
                    {submitLabels[authMode]}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
            {isLoginOrSignup && (
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-3 text-xs text-(--text-secondary)">
                  <span className="h-px flex-1 bg-(--border-neutral)" />
                  <span>ou continuer avec</span>
                  <span className="h-px flex-1 bg-(--border-neutral)" />
                </div>
                <button
                  className="auth-view__google"
                  disabled={authSubmitting}
                  onClick={onSignInWithGoogle}
                  type="button"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-5 place-items-center rounded-full bg-white font-bold text-[#4285f4]"
                  >
                    G
                  </span>
                  {authSubmitting
                    ? "Redirection vers Google…"
                    : "Continuer avec Google"}
                </button>
                {authMode === "login" && (
                  <button
                    className="auth-view__google mt-2.5"
                    disabled={authSubmitting}
                    onClick={onSignInWithPasskey}
                    type="button"
                  >
                    <Fingerprint size={18} aria-hidden="true" />
                    {authSubmitting
                      ? "Vérification en cours…"
                      : "Se connecter avec Face ID ou une passkey"}
                  </button>
                )}
              </div>
            )}
            {isLoginOrSignup && (
              <p className="mt-5 text-center text-sm text-(--text-secondary)">
                {authMode === "login"
                  ? "Pas encore de compte ? "
                  : "Déjà un compte ? "}
                <button
                  className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-(--team-b-blue) hover:text-white"
                  onClick={() => {
                    onAuthModeChange(authMode === "login" ? "signup" : "login");
                    onClearNotice();
                  }}
                  type="button"
                >
                  {authMode === "login" ? "Inscris-toi" : "Connecte-toi"}
                </button>
              </p>
            )}
            {authNotice && (
              <p
                className={`mt-3.5 text-[11px] ${authNoticeKind === "error" ? "text-(--team-a-red)" : "text-(--status-success)"}`}
                role={authNoticeKind === "error" ? "alert" : "status"}
              >
                {authNotice}
              </p>
            )}
            {(authMode === "recovery" ||
              authMode === "resend-confirmation" ||
              authMode === "update-password") && (
              <button
                className="auth-view__back"
                onClick={() => {
                  onAuthModeChange("login");
                  onClearNotice();
                }}
                type="button"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </section>
      </Drawer>
    </main>
  );
}
