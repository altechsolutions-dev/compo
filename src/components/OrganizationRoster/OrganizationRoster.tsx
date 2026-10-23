import { useState } from "react";
import { Share2, Shield, UserMinus } from "lucide-react";
import type { OrganizationMember, Player } from "../../types";
import "./OrganizationRoster.css";

export type OrganizationRosterProps = {
  organization: string;
  members: OrganizationMember[];
  players: Player[];
  currentUserId?: string;
  canInvite: boolean;
  canLeave: boolean;
  isCurrentUserOwner: boolean;
  isLeaving: boolean;
  leaveNotice: string;
  canManageMembers: boolean;
  removingMemberId: string | null;
  removeMemberNotice: string;
  getPlayerRating: (player: Player) => number;
  onInvite: () => void;
  onLeave: () => Promise<boolean>;
  onRemoveMember: (userId: string) => Promise<boolean>;
};

export function OrganizationRoster({
  organization,
  members,
  players,
  currentUserId,
  canInvite,
  canLeave,
  isCurrentUserOwner,
  isLeaving,
  leaveNotice,
  canManageMembers,
  removingMemberId,
  removeMemberNotice,
  getPlayerRating,
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
            {organization || "Votre organisation"}
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
          {members.length} joueurs · Stats / 100
        </span>
      </div>
      {removeMemberNotice && (
        <p className="my-3 text-xs text-(--team-a-red)" role="alert">
          {removeMemberNotice}
        </p>
      )}
      <div
        className="organization-roster__table border-t border-(--line)"
        role="table"
        aria-label="Effectif de l’organisation"
      >
        <div
          className="organization-roster__columns min-h-9.5 items-center text-[9px] font-bold text-(--text-secondary) max-[680px]:text-[7px] max-[680px]:leading-1.2"
          role="row"
        >
          {["JOUEUR", "POSTE", "ATTAQUE", "DÉFENSE", "ENDURANCE", "GLOBAL"].map(
            (label) => (
              <span key={label} role="columnheader">
                {label}
              </span>
            ),
          )}
        </div>
        {members.map((member) => {
          const player = players.find(
            (candidate) => candidate.id === member.user_id,
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
              <span role="cell">{player?.position ?? "Joueur"}</span>
              <span role="cell">{player?.attack ?? "—"}</span>
              <span role="cell">{player?.defense ?? "—"}</span>
              <span role="cell">{player?.stamina ?? "—"}</span>
              <span
                className="flex items-center justify-between gap-1 text-(--text-primary) max-[680px]:text-[9px]"
                role="cell"
              >
                <strong>{player ? getPlayerRating(player) : "—"}</strong>
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
              </span>
            </div>
          );
        })}
      </div>
      {members.length === 0 && (
        <p className="py-4.5 text-xs text-(--text-secondary)">
          Aucun joueur dans cette organisation pour le moment.
        </p>
      )}
      <p className="mt-4.5 flex items-center gap-2.25 text-[11px] text-(--text-secondary) [&>svg]:text-(--team-b-blue)">
        <Shield size={16} /> Les équipes sont réparties selon l'équilibre des
        postes, de l'attaque, de la défense et de l'endurance.
      </p>
      {canLeave && (
        <div className="mt-8 flex flex-col items-end border-t border-(--line) pt-3">
          {leaveNotice && (
            <p className="mb-2 w-full text-xs text-(--team-a-red)" role="alert">
              {leaveNotice}
            </p>
          )}
          {confirmingLeave ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <p className="m-0 max-w-xl text-xs leading-relaxed text-(--text-secondary)">
                Confirmer le départ de {organization} ?
                {isCurrentUserOwner && (
                  <>
                    {" "}
                    En tant que propriétaire, ton rôle sera transmis à un autre
                    membre. Le dernier propriétaire ne peut pas quitter seul.
                  </>
                )}
              </p>
              <div className="flex items-center gap-3">
                <button
                  className="cursor-pointer border-0 bg-transparent p-1 text-xs text-(--muted) hover:text-(--ink)"
                  disabled={isLeaving}
                  onClick={() => setConfirmingLeave(false)}
                  type="button"
                >
                  Annuler
                </button>
                <button
                  className="cursor-pointer border-0 bg-transparent p-1 text-xs font-semibold text-(--team-a-red) hover:underline disabled:cursor-wait disabled:opacity-50"
                  disabled={isLeaving}
                  onClick={() => {
                    void onLeave().then((didLeave) => {
                      if (didLeave) setConfirmingLeave(false);
                    });
                  }}
                  type="button"
                >
                  {isLeaving ? "Départ…" : "Confirmer le départ"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="cursor-pointer border-0 bg-transparent p-1 text-[11px] text-(--muted) hover:text-(--team-a-red)"
              onClick={() => setConfirmingLeave(true)}
              type="button"
            >
              Quitter l’organisation
            </button>
          )}
        </div>
      )}
    </section>
  );
}
