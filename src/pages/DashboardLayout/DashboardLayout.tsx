import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { DashboardFooter } from "../../components/DashboardFooter/DashboardFooter";
import { DashboardHeader } from "../../components/DashboardHeader/DashboardHeader";
import type { DashboardView } from "../../components/DashboardHero/DashboardHero";
import "./DashboardLayout.css";

export type DashboardLayoutProps = {
  organization: string;
  organizationMemberCount: number;
  avatarLabel: string;
  isSignedIn: boolean;
  canShareInvite: boolean;
  canInstall: boolean;
  unreadDiscussionCount?: number;
  onNavigate: (view: DashboardView) => void;
  onChooseOrganization: () => void;
  onShareInvite: () => void;
  onJoinWithCode: () => void;
  onSignOut: () => void;
  onInstall: () => void;
  isSynchronized: boolean;
  children: ReactNode;
};

export function DashboardLayout({
  organization,
  organizationMemberCount,
  avatarLabel,
  isSignedIn,
  canShareInvite,
  canInstall,
  unreadDiscussionCount = 0,
  onNavigate,
  onChooseOrganization,
  onShareInvite,
  onJoinWithCode,
  onSignOut,
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
        : location.pathname === "/app/discussions"
          ? "discussions"
          : "matches";

  return (
    <main className="dashboard-page mx-auto flex min-h-svh w-[min(calc(100%-56px),1440px)] flex-col animate-[appear_500ms_ease-out_both] max-[680px]:w-[calc(100%-32px)] max-[380px]:w-[calc(100%-24px)]">
      <DashboardHeader
        organization={organization}
        organizationMemberCount={organizationMemberCount}
        activeView={activeView}
        avatarLabel={avatarLabel}
        isSignedIn={isSignedIn}
        canShareInvite={canShareInvite}
        canInstall={canInstall}
        unreadDiscussionCount={unreadDiscussionCount}
        onNavigate={onNavigate}
        onChooseOrganization={onChooseOrganization}
        onShareInvite={onShareInvite}
        onJoinWithCode={onJoinWithCode}
        onSignOut={onSignOut}
        onInstall={onInstall}
      />

      <div className="dashboard-content flex-1">{children}</div>

      <DashboardFooter
        organization={organization}
        isSynchronized={isSynchronized}
      />
    </main>
  );
}
