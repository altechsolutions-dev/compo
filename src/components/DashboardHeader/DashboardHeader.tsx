import {
  CalendarDays,
  ChevronDown,
  Download,
  Share2,
  Users,
  UserRoundPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import type { DashboardView } from "../DashboardHero/DashboardHero";
import "./DashboardHeader.css";

export type DashboardHeaderProps = {
  organization: string;
  organizationMemberCount: number;
  activeView: DashboardView;
  avatarLabel: string;
  isSignedIn: boolean;
  canShareInvite: boolean;
  canInstall: boolean;
  onNavigate: (view: DashboardView) => void;
  onChooseOrganization: () => void;
  onShareInvite: () => void;
  onJoinWithCode: () => void;
  onSignOut: () => void;
  onInstall: () => void;
};

export function DashboardHeader({
  organization,
  organizationMemberCount,
  activeView,
  avatarLabel,
  isSignedIn,
  canShareInvite,
  canInstall,
  onNavigate,
  onChooseOrganization,
  onShareInvite,
  onJoinWithCode,
  onSignOut,
  onInstall,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header relative grid min-h-15 grid-cols-[1fr_auto_1fr] items-center border-b border-(--line) max-[680px]:grid-cols-[1fr_auto] max-[680px]:gap-y-1.5 max-[680px]:py-2">
      <Link
        className="inline-flex items-center gap-2.25 text-[19px] font-bold text-(--ink) no-underline"
        to="/app/matches"
        aria-label="Compo, accueil"
      >
        <img
          className="block h-auto w-30 max-[380px]:w-26"
          src={logo}
          alt="Compo"
        />
      </Link>
      <nav
        className="main-nav flex min-h-12.25 items-center gap-6.25 max-[680px]:col-span-full max-[680px]:row-2 max-[680px]:gap-7"
        aria-label="Navigation principale"
        role="tablist"
      >
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "matches" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("matches")}
          type="button"
          role="tab"
          aria-selected={activeView === "matches"}
        >
          <CalendarDays size={16} /> Matchs
        </button>
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "live" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("live")}
          type="button"
          role="tab"
          aria-selected={activeView === "live"}
        >
          <span className="size-1.5 rounded-full bg-(--team-a-red)" /> En direct
        </button>
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "organization" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("organization")}
          type="button"
          role="tab"
          aria-selected={activeView === "organization"}
        >
          <Users size={16} /> Club
          <span className="min-w-4.5 rounded-[9px] bg-(--bg-elevated) px-1.25 py-px text-center text-[10px] text-(--text-secondary)">
            {organizationMemberCount}
          </span>
        </button>
      </nav>
      <div className="flex items-center justify-self-end gap-3.75 max-[680px]:gap-2.25">
        <button
          className="inline-flex cursor-pointer items-center gap-2.25 border-0 bg-transparent px-0 py-1.25 text-xs font-semibold text-(--ink) max-[680px]:gap-1.75 max-[680px]:text-[11px] [&>svg]:text-(--muted) [&>span:nth-child(2)]:max-[380px]:max-w-27.5 [&>span:nth-child(2)]:max-[380px]:overflow-hidden [&>span:nth-child(2)]:max-[380px]:text-ellipsis [&>span:nth-child(2)]:max-[380px]:whitespace-nowrap"
          onClick={onChooseOrganization}
          aria-label="Choisir un club"
          type="button"
        >
          <span className="grid size-7 place-items-center rounded-[7px] bg-(--bg-elevated) text-xs font-bold text-(--team-b-blue)">
            {organization.slice(0, 1).toUpperCase()}
          </span>
          <span>{organization}</span>
          <ChevronDown size={15} />
        </button>
        <button
          className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canShareInvite}
          onClick={onShareInvite}
          title="Partager le lien d’invitation"
          type="button"
          aria-label="Partager le lien d’invitation"
        >
          <Share2 size={16} />
        </button>
        <button
          className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
          onClick={onJoinWithCode}
          title="Rejoindre avec un code"
          type="button"
          aria-label="Rejoindre un club avec un code"
        >
          <UserRoundPlus size={16} />
        </button>
        <span className="h-6 w-px bg-(--line) max-[680px]:h-5" />
        <button
          className="grid size-8 cursor-pointer place-items-center rounded-full border border-(--border-neutral) bg-(--bg-elevated) text-[10px] font-bold text-(--text-primary) disabled:cursor-not-allowed"
          disabled={!isSignedIn}
          onClick={onSignOut}
          type="button"
          title={isSignedIn ? "Se déconnecter" : "Profil de démonstration"}
          aria-label={isSignedIn ? "Se déconnecter" : "Profil de démonstration"}
        >
          {avatarLabel}
        </button>
        {canInstall && (
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
            onClick={onInstall}
            type="button"
            aria-label="Installer Compo"
          >
            <Download size={17} />
          </button>
        )}
      </div>
    </header>
  );
}
