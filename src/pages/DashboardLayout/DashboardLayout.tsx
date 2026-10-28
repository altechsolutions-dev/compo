import type { ReactNode } from "react";
import { Fingerprint } from "lucide-react";
import { useLocation } from "react-router-dom";
import { DashboardFooter } from "../../components/DashboardFooter/DashboardFooter";
import { DashboardHeader } from "../../components/DashboardHeader/DashboardHeader";
import type { DashboardView } from "../../components/DashboardHero/DashboardHero";
import "./DashboardLayout.css";

export type DashboardLayoutProps = {
  organization: string;
  organizationMemberCount: number;
  isSignedIn: boolean;
  canInstall: boolean;
  onNavigate: (view: DashboardView) => void;
  onChooseOrganization: () => void;
  onSignOut: () => void;
  onRegisterPasskey: () => void;
  passkeySubmitting: boolean;
  passkeyPromptOpen: boolean;
  onDismissPasskeyPrompt: () => void;
  passkeyNotice: string;
  onInstall: () => void;
  isSynchronized: boolean;
  children: ReactNode;
};

export function DashboardLayout({
  organization,
  organizationMemberCount,
  isSignedIn,
  canInstall,
  onNavigate,
  onChooseOrganization,
  onSignOut,
  onRegisterPasskey,
  passkeySubmitting,
  passkeyPromptOpen,
  onDismissPasskeyPrompt,
  passkeyNotice,
  onInstall,
  isSynchronized,
  children,
}: DashboardLayoutProps) {
  const location = useLocation();
  const activeView: DashboardView =
    location.pathname === "/app/organizations"
      ? "organization"
      : location.pathname === "/app/live"
        ? "live"
        : "matches";

  return (
    <main className="dashboard-page mx-auto flex min-h-svh w-[min(calc(100%-56px),1440px)] flex-col animate-[appear_500ms_ease-out_both] max-[680px]:w-[calc(100%-32px)] max-[380px]:w-[calc(100%-24px)]">
      <DashboardHeader
        organization={organization}
        organizationMemberCount={organizationMemberCount}
        activeView={activeView}
        isSignedIn={isSignedIn}
        canInstall={canInstall}
        onNavigate={onNavigate}
        onChooseOrganization={onChooseOrganization}
        onSignOut={onSignOut}
        onInstall={onInstall}
      />

      {passkeyPromptOpen && (
        <section
          aria-labelledby="passkey-prompt-title"
          className="flex items-center justify-between gap-4 border-b border-(--line) py-4 max-[680px]:flex-col max-[680px]:items-stretch"
        >
          <div>
            <h2
              className="mb-1 text-sm font-semibold text-(--ink)"
              id="passkey-prompt-title"
            >
              Active Face ID ou l’empreinte
            </h2>
            <p className="m-0 text-xs leading-relaxed text-(--muted)">
              Valide la demande de ton téléphone pour te connecter plus vite la
              prochaine fois.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 max-[680px]:justify-end">
            <button
              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-[3px] border-0 bg-(--team-b-blue) px-3 text-xs font-semibold text-(--bg-main) disabled:cursor-wait disabled:opacity-60"
              disabled={passkeySubmitting}
              onClick={onRegisterPasskey}
              type="button"
            >
              <Fingerprint size={16} />
              {passkeySubmitting ? "Activation…" : "Activer"}
            </button>
            <button
              className="min-h-9 cursor-pointer rounded-[3px] border border-(--line) bg-transparent px-3 text-xs font-medium text-(--ink)"
              onClick={onDismissPasskeyPrompt}
              type="button"
            >
              Plus tard
            </button>
          </div>
        </section>
      )}

      {passkeyNotice && (
        <p className="my-2 text-xs text-(--text-secondary)" role="status">
          {passkeyNotice}
        </p>
      )}

      <div className="dashboard-content flex-1">{children}</div>

      <DashboardFooter
        organization={organization}
        isSynchronized={isSynchronized}
      />
    </main>
  );
}
