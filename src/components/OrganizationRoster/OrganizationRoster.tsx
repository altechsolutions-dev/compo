import { useState } from "react";
import { LogOut, Share2, UserMinus } from "lucide-react";
import type { OrganizationMember, OrganizationPlayerStats } from "../../types";
import "./OrganizationRoster.css";

export type OrganizationRosterProps = {
  organization: string;
  members: OrganizationMember[];
  playerStats: OrganizationPlayerStats[];
  playerStatsNotice: string;
  currentUserId?: string;
  canInvite: boolean;
  canLeave: boolean;
  isCurrentUserOwner: boolean;
  isLeaving: boolean;
  leaveNotice: string;
  canManageMembers: boolean;
  removingMemberId: string | null;
  removeMemberNotice: string;
  onInvite: () => void;
  onLeave: () => Promise<boolean>;
  onRemoveMember: (userId: string) => Promise<boolean>;
};

export function OrganizationRoster({
  organization,
  members,
  playerStats,
  playerStatsNotice,
  currentUserId,
  canInvite,
  canLeave,
  isCurrentUserOwner,
  isLeaving,
  leaveNotice,
  canManageMembers,
  removingMemberId,
  removeMemberNotice,
  onInvite,
  onLeave,
  onRemoveMember,
}: OrganizationRosterProps) {
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingRemovalId, setConfirmingRemovalId] = useState<string | null>(
    null,
  );

  return (
    <section
      className="organization-roster pb-12"
      aria-labelledby="players-heading"
    >
      <div className="mb-8 flex items-center justify-between gap-5 border-b border-(--line) pb-6 max-[680px]:mb-6 max-[680px]:items-start">
        <div>
          <p className="mb-2 text-[10px] font-bold tracking-[1.7px] text-(--muted)">
            ESPACE CLUB
          </p>
          <h2 className="m-0 font-sans text-xl font-semibold text-(--ink)">
            {organization || "Votre club"}
          </h2>
          <p className="mt-2 text-xs text-(--text-secondary)">
            Retrouvez les membres et gérez la vie de votre collectif.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[3px] border-0 bg-(--team-b-blue) px-3.5 text-xs font-bold text-(--bg-main) hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 max-[500px]:size-10 max-[500px]:p-0 [&>span]:max-[500px]:sr-only"
          disabled={!canInvite}
          onClick={onInvite}
          type="button"
        >
          <Share2 size={15} /> <span>Inviter des joueurs</span>
        </button>
      </div>
      <div className="mb-3 flex items-center justify-between gap-3.75">
        <h2 className="m-0 text-base" id="players-heading">
          Effectif
        </h2>
        <span className="text-[11px] text-(--muted)">
          {members.length} joueurs
        </span>
      </div>
      {playerStatsNotice && (
        <p className="my-3 text-xs text-(--team-a-red)" role="alert">
          {playerStatsNotice}
        </p>
      )}
      {removeMemberNotice && (
        <p className="my-3 text-xs text-(--team-a-red)" role="alert">
          {removeMemberNotice}
        </p>
      )}
      <div
        className="organization-roster__table border-t border-(--line)"
        role="table"
        aria-label="Effectif du club"
      >
        <div
          className="organization-roster__columns min-h-9.5 items-center text-[9px] font-bold text-(--text-secondary) max-[680px]:text-[7px] max-[680px]:leading-1.2"
          role="row"
        >
          {[
            "JOUEUR",
            "NOTE",
            "MATCHS",
            "VICTOIRES",
            "NULS",
            "DÉFAITES",
            "HOMME DU MATCH",
            "MEILLEUR BUTEUR",
            "BUTS",
          ].map((label) => (
            <span key={label} role="columnheader">
              {label}
            </span>
          ))}
        </div>
        {members.map((member) => {
          const stats = playerStats.find(
            (candidate) => candidate.user_id === member.user_id,
          );
          return (
            <div
              className="organization-roster__columns organization-roster__row min-h-14.5 items-center border-t border-(--line) text-[11px] text-(--text-secondary) max-[680px]:text-[9px]"
              key={member.user_id}
              role="row"
            >
              <span
                className="flex min-w-0 items-center gap-2.5 text-(--text-primary) max-[680px]:gap-1.25"
                role="cell"
              >
                <span className="grid size-6.25 shrink-0 place-items-center rounded-full bg-(--bg-elevated) text-[9px] font-bold text-(--text-secondary)">
                  {member.display_name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-semibold">
                  {member.display_name}
                  {member.user_id === currentUserId && (
                    <small className="ml-1.75 text-[9px] font-normal text-(--text-secondary) max-[680px]:mt-px max-[680px]:ml-0 max-[680px]:block max-[680px]:text-[8px]">
                      Vous
                    </small>
                  )}
                </strong>
              </span>
              <span role="cell">{stats?.overall_rating ?? "—"}</span>
              <span role="cell">{stats?.matches_played ?? "—"}</span>
              <span role="cell">{stats?.wins ?? "—"}</span>
              <span role="cell">{stats?.draws ?? "—"}</span>
              <span role="cell">{stats?.losses ?? "—"}</span>
              <span role="cell">{stats?.man_of_the_match_count ?? "—"}</span>
              <span role="cell">{stats?.best_scorer_count ?? "—"}</span>
              <span
                className="flex items-center justify-between gap-1 text-(--text-primary) max-[680px]:text-[9px]"
                role="cell"
              >
                <strong>{stats?.goals ?? "—"}</strong>
                {canManageMembers &&
                  member.role === "member" &&
                  member.user_id !== currentUserId &&
                  (confirmingRemovalId === member.user_id ? (
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <button
                        className="cursor-pointer border-0 bg-transparent p-1 text-[10px] text-(--muted) hover:text-(--ink)"
                        disabled={removingMemberId === member.user_id}
                        onClick={() => setConfirmingRemovalId(null)}
                        type="button"
                      >
                        Annuler
                      </button>
                      <button
                        className="cursor-pointer border-0 bg-transparent p-1 text-[10px] font-semibold text-(--team-a-red) hover:underline disabled:cursor-wait disabled:opacity-50"
                        disabled={removingMemberId === member.user_id}
                        onClick={() => {
                          void onRemoveMember(member.user_id).then(
                            (removed) => {
                              if (removed) setConfirmingRemovalId(null);
                            },
                          );
                        }}
                        type="button"
                      >
                        {removingMemberId === member.user_id
                          ? "Retrait…"
                          : "Confirmer"}
                      </button>
                    </span>
                  ) : (
                    <button
                      aria-label={`Retirer ${member.display_name}`}
                      className="inline-flex min-h-7 shrink-0 cursor-pointer items-center gap-1 rounded-sm border border-(--border-neutral) bg-transparent px-1.5 text-[9px] font-semibold text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red)"
                      onClick={() => setConfirmingRemovalId(member.user_id)}
                      title="Retirer ce membre"
                      type="button"
                    >
                      <UserMinus size={12} aria-hidden="true" />
                      <span className="max-[680px]:sr-only">Retirer</span>
                    </button>
                  ))}
                {canLeave &&
                  member.user_id === currentUserId &&
                  (confirmingLeave ? (
                    <span className="inline-flex shrink-0 items-center gap-1">
                      <button
                        className="cursor-pointer border-0 bg-transparent p-1 text-[10px] text-(--muted) hover:text-(--ink)"
                        disabled={isLeaving}
                        onClick={() => setConfirmingLeave(false)}
                        type="button"
                      >
                        Annuler
                      </button>
                      <button
                        className="cursor-pointer border-0 bg-transparent p-1 text-[10px] font-semibold text-(--team-a-red) hover:underline disabled:cursor-wait disabled:opacity-50"
                        disabled={isLeaving}
                        onClick={() => {
                          void onLeave().then((didLeave) => {
                            if (didLeave) setConfirmingLeave(false);
                          });
                        }}
                        type="button"
                      >
                        {isLeaving ? "Départ…" : "Confirmer"}
                      </button>
                    </span>
                  ) : (
                    <button
                      aria-label="Quitter le club"
                      className="inline-flex min-h-7 shrink-0 cursor-pointer items-center gap-1 rounded-sm border border-(--border-neutral) bg-transparent px-1.5 text-[9px] font-semibold text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red)"
                      onClick={() => setConfirmingLeave(true)}
                      title="Quitter le club"
                      type="button"
                    >
                      <LogOut size={12} aria-hidden="true" />
                      <span className="max-[680px]:sr-only">Quitter</span>
                    </button>
                  ))}
              </span>
            </div>
          );
        })}
      </div>
      {members.length === 0 && (
        <p className="py-4.5 text-xs text-(--text-secondary)">
          Aucun joueur dans ce club pour le moment.
        </p>
      )}
      {canLeave && (
        <div className="mt-3">
          {leaveNotice && (
            <p className="mb-2 text-xs text-(--team-a-red)" role="alert">
              {leaveNotice}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
