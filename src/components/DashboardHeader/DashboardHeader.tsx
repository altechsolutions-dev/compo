import {
  CalendarDays,
  ChevronDown,
  CircleDot,
  MessageCircle,
  Download,
  MoreHorizontal,
  Share2,
  Users,
  UserRoundPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  unreadDiscussionCount?: number;
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
  unreadDiscussionCount = 0,
  onNavigate,
  onChooseOrganization,
  onShareInvite,
  onJoinWithCode,
  onSignOut,
  onInstall,
}: DashboardHeaderProps) {
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileActionsOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setMobileActionsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileActionsOpen(false);
      actionsRef.current
        ?.querySelector<HTMLButtonElement>(".dashboard-header__actions-toggle")
        ?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileActionsOpen]);

  return (
    <header className="dashboard-header relative grid min-h-15 grid-cols-[1fr_auto_1fr] items-center border-b border-(--line) max-[680px]:grid-cols-[1fr_auto] max-[680px]:gap-y-1.5 max-[680px]:py-2">
      <Link
        className="inline-flex items-center gap-2.25 text-[19px] font-bold text-(--ink) no-underline"
        to="/app/matches"
        aria-label="Compo, accueil"
      >
        <img
          className="block h-auto w-30 max-[680px]:w-22"
          src={logo}
          alt="Compo"
        />
      </Link>
      <nav
        className="main-nav flex min-h-12.25 items-center gap-6.25 max-[680px]:col-span-full max-[680px]:row-2 max-[680px]:gap-4"
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
          <CalendarDays size={16} />
          <span>Matchs</span>
        </button>
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "live" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("live")}
          type="button"
          role="tab"
          aria-selected={activeView === "live"}
        >
          <CircleDot
            aria-hidden="true"
            className="text-(--team-a-red)"
            size={16}
          />
          <span>En direct</span>
        </button>
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "discussions" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("discussions")}
          type="button"
          role="tab"
          aria-selected={activeView === "discussions"}
          aria-label={
            unreadDiscussionCount > 0
              ? "Discussions, messages non lus"
              : "Discussions"
          }
        >
          <MessageCircle size={16} />
          <span>Discussions</span>
          {unreadDiscussionCount > 0 && (
            <span
              aria-hidden="true"
              className="relative -top-0.5 size-2 shrink-0 rounded-full bg-(--team-a-red) ring-2 ring-(--bg-main)"
            />
          )}
        </button>
        <button
          className={`relative inline-flex h-12.25 cursor-pointer items-center gap-2 border-0 bg-transparent text-xs ${activeView === "organization" ? "font-semibold text-(--ink) after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-(--team-b-blue) after:content-['']" : "text-(--muted)"}`}
          onClick={() => onNavigate("organization")}
          type="button"
          role="tab"
          aria-selected={activeView === "organization"}
          aria-label={`Club, ${organizationMemberCount} membres`}
        >
          <Users size={16} />
          <span>Club</span>
        </button>
      </nav>
      <div
        className={`dashboard-header__actions ${mobileActionsOpen ? "is-open" : ""}`}
        ref={actionsRef}
      >
        <button
          aria-expanded={mobileActionsOpen}
          aria-controls="dashboard-header-secondary-actions"
          aria-label={
            mobileActionsOpen
              ? "Fermer le menu d’actions"
              : "Ouvrir le menu d’actions"
          }
          className="dashboard-header__actions-toggle"
          onClick={() => setMobileActionsOpen((open) => !open)}
          type="button"
        >
          <MoreHorizontal aria-hidden="true" size={20} />
        </button>
        <div
          aria-label="Actions du club"
          className="dashboard-header__secondary-actions"
          id="dashboard-header-secondary-actions"
          role="group"
        >
          <button
            className="inline-flex cursor-pointer items-center gap-2.25 border-0 bg-transparent px-0 py-1.25 text-xs font-semibold text-(--ink) max-[680px]:gap-1.75 max-[680px]:text-[11px] max-[680px]:max-w-31 [&>svg]:text-(--muted) [&>span:nth-child(2)]:max-[680px]:max-w-18 [&>span:nth-child(2)]:max-[680px]:overflow-hidden [&>span:nth-child(2)]:max-[680px]:text-ellipsis [&>span:nth-child(2)]:max-[680px]:whitespace-nowrap"
            onClick={() => {
              setMobileActionsOpen(false);
              onChooseOrganization();
            }}
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
            onClick={() => {
              setMobileActionsOpen(false);
              onShareInvite();
            }}
            title="Partager le lien d’invitation"
            type="button"
            aria-label="Partager le lien d’invitation"
          >
            <Share2 size={16} />
            <span className="dashboard-header__mobile-label">
              Partager l’invitation
            </span>
          </button>
          <button
            className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => {
              setMobileActionsOpen(false);
              onJoinWithCode();
            }}
            title="Rejoindre avec un code"
            type="button"
            aria-label="Rejoindre un club avec un code"
          >
            <UserRoundPlus size={16} />
            <span className="dashboard-header__mobile-label">
              Rejoindre avec un code
            </span>
          </button>
          <span className="h-6 w-px bg-(--line) max-[680px]:h-5" />
          <button
            className="grid size-8 cursor-pointer place-items-center rounded-full border border-(--border-neutral) bg-(--bg-elevated) text-[10px] font-bold text-(--text-primary) disabled:cursor-not-allowed"
            disabled={!isSignedIn}
            onClick={() => {
              setMobileActionsOpen(false);
              onSignOut();
            }}
            type="button"
            title={isSignedIn ? "Se déconnecter" : "Profil de démonstration"}
            aria-label={
              isSignedIn ? "Se déconnecter" : "Profil de démonstration"
            }
          >
            {avatarLabel}
            <span className="dashboard-header__mobile-label">
              {isSignedIn ? "Se déconnecter" : "Profil de démonstration"}
            </span>
          </button>
          {canInstall && (
            <button
              className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--line) bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setMobileActionsOpen(false);
                onInstall();
              }}
              type="button"
              aria-label="Installer Compo"
            >
              <Download size={17} />
              <span className="dashboard-header__mobile-label">
                Installer Compo
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
