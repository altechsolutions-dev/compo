import { useState } from "react";
import { LogOut, Share2, UserMinus, X } from "lucide-react";
import { Drawer } from "../Drawer/Drawer";
import { useDrawerTransition } from "../../hooks/useDrawerTransition/useDrawerTransition";
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
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const selectedMember = members.find(
    (member) => member.user_id === selectedMemberId,
  );
  const selectedStats = playerStats.find(
    (stats) => stats.user_id === selectedMemberId,
  );
  const playerDrawer = useDrawerTransition(Boolean(selectedMember));

  const closePlayerDrawer = () => {
    setSelectedMemberId(null);
    setConfirmingLeave(false);
    setConfirmingRemovalId(null);
  };

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
      <div className="organization-roster__list" aria-label="Effectif du club">
        {members.map((member) => {
          return (
            <button
              aria-current={
                selectedMemberId === member.user_id ? "true" : undefined
              }
              className="organization-roster__player"
              key={member.user_id}
              onClick={() => {
                setSelectedMemberId(member.user_id);
                setConfirmingLeave(false);
                setConfirmingRemovalId(null);
              }}
              type="button"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--bg-elevated) text-xs font-bold text-(--text-secondary)">
                {member.display_name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="min-w-0 text-left">
                <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-(--text-primary)">
                  {member.display_name}
                  {member.user_id === currentUserId && (
                    <small className="ml-2 text-[10px] font-normal text-(--text-secondary)">
                      Vous
                    </small>
                  )}
                </strong>
                <span className="mt-1 block text-[10px] text-(--text-secondary)">
                  {member.role === "owner" ? "Propriétaire" : "Membre"}
                </span>
              </span>
              <span
                className="ml-auto text-xs text-(--text-secondary)"
                aria-hidden="true"
              >
                Détails&nbsp;→
              </span>
            </button>
          );
        })}
      </div>
      {members.length === 0 && (
        <p className="py-4.5 text-xs text-(--text-secondary)">
          Aucun joueur dans ce club pour le moment.
        </p>
      )}
      <Drawer
        mounted={playerDrawer.mounted}
        open={playerDrawer.open}
        onClose={closePlayerDrawer}
        labelledBy="organization-player-drawer-title"
        panelClassName="h-full w-full max-w-180 overflow-y-auto border-l border-(--line) bg-(--bg-main) p-8 text-(--text-primary) shadow-[-18px_0_48px_#0005] max-[600px]:max-w-full max-[600px]:border-l-0 max-[600px]:p-5"
      >
        {selectedMember && (
          <>
            <div className="mb-8 flex items-start justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-full bg-(--bg-elevated) text-sm font-bold text-(--text-secondary)">
                  {selectedMember.display_name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </span>
                <div className="min-w-0">
                  <p className="drawer-eyebrow mb-1.5">FICHE JOUEUR</p>
                  <h2
                    className="drawer-title mb-0 overflow-hidden text-ellipsis"
                    id="organization-player-drawer-title"
                  >
                    {selectedMember.display_name}
                  </h2>
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    {selectedMember.role === "owner"
                      ? "Propriétaire"
                      : "Membre"}
                  </p>
                </div>
              </div>
              <button
                aria-label="Fermer"
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-[3px] border border-(--border-neutral) bg-transparent"
                onClick={closePlayerDrawer}
                type="button"
              >
                <X size={19} />
              </button>
            </div>
            <section aria-label="Statistiques du joueur">
              <div className="mb-6 border-b border-(--line) pb-5">
                <p className="drawer-eyebrow mb-2">NOTE GLOBALE</p>
                <p className="m-0 text-5xl font-semibold text-(--text-primary)">
                  {selectedStats?.overall_rating ?? "—"}
                </p>
              </div>
              <h3 className="mb-3 text-sm font-semibold">Statistiques</h3>
              <dl className="grid grid-cols-2 gap-px border border-(--line) bg-(--line)">
                {[
                  ["Matchs joués", selectedStats?.matches_played],
                  ["Victoires", selectedStats?.wins],
                  ["Nuls", selectedStats?.draws],
                  ["Défaites", selectedStats?.losses],
                  ["Homme du match", selectedStats?.man_of_the_match_count],
                  ["Meilleur buteur", selectedStats?.best_scorer_count],
                  ["Buts", selectedStats?.goals],
                ].map(([label, value]) => (
                  <div className="bg-(--bg-main) p-3.5" key={label}>
                    <dt className="text-[10px] text-(--text-secondary)">
                      {label}
                    </dt>
                    <dd className="mb-0 mt-1 text-lg font-semibold">
                      {value ?? "—"}
                    </dd>
                  </div>
                ))}
                <div aria-hidden="true" className="bg-(--bg-main) p-3.5" />
              </dl>
            </section>
            {(canManageMembers ||
              (canLeave && selectedMember.user_id === currentUserId)) && (
              <section className="mt-8 border-t border-(--line) pt-5">
                <h3 className="mb-3 text-sm font-semibold">Actions du club</h3>
                {canManageMembers &&
                  selectedMember.role === "member" &&
                  selectedMember.user_id !== currentUserId &&
                  (confirmingRemovalId === selectedMember.user_id ? (
                    <div>
                      <p className="mb-3 text-xs text-(--text-secondary)">
                        Retirer {selectedMember.display_name} du club ?
                      </p>
                      <div className="flex gap-2">
                        <button
                          className="min-h-9 cursor-pointer border border-(--border-neutral) bg-transparent px-3 text-xs"
                          disabled={removingMemberId === selectedMember.user_id}
                          onClick={() => setConfirmingRemovalId(null)}
                          type="button"
                        >
                          Annuler
                        </button>
                        <button
                          className="min-h-9 cursor-pointer border-0 bg-(--team-a-red) px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50"
                          disabled={removingMemberId === selectedMember.user_id}
                          onClick={() => {
                            void onRemoveMember(selectedMember.user_id).then(
                              (removed) => {
                                if (removed) closePlayerDrawer();
                              },
                            );
                          }}
                          type="button"
                        >
                          {removingMemberId === selectedMember.user_id
                            ? "Retrait…"
                            : "Confirmer le retrait"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="inline-flex min-h-9 cursor-pointer items-center gap-2 border border-(--border-neutral) bg-transparent px-3 text-xs font-semibold text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red)"
                      onClick={() =>
                        setConfirmingRemovalId(selectedMember.user_id)
                      }
                      type="button"
                    >
                      <UserMinus size={14} aria-hidden="true" />
                      Retirer ce membre
                    </button>
                  ))}
                {canLeave && selectedMember.user_id === currentUserId && (
                  <div>
                    {confirmingLeave && (
                      <p className="mb-3 text-xs leading-relaxed text-(--text-secondary)">
                        Confirmer le départ de {organization} ?
                        {isCurrentUserOwner && (
                          <>
                            {" "}
                            En tant que propriétaire, ton rôle sera transmis à
                            un autre membre. Le dernier propriétaire ne peut pas
                            quitter seul.
                          </>
                        )}
                      </p>
                    )}
                    {leaveNotice && (
                      <p
                        className="mb-3 text-xs text-(--team-a-red)"
                        role="alert"
                      >
                        {leaveNotice}
                      </p>
                    )}
                    {confirmingLeave ? (
                      <div className="flex gap-2">
                        <button
                          className="min-h-9 cursor-pointer border border-(--border-neutral) bg-transparent px-3 text-xs"
                          disabled={isLeaving}
                          onClick={() => setConfirmingLeave(false)}
                          type="button"
                        >
                          Annuler
                        </button>
                        <button
                          className="min-h-9 cursor-pointer border-0 bg-(--team-a-red) px-3 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-50"
                          disabled={isLeaving}
                          onClick={() => {
                            void onLeave().then((didLeave) => {
                              if (didLeave) closePlayerDrawer();
                            });
                          }}
                          type="button"
                        >
                          {isLeaving ? "Départ…" : "Confirmer le départ"}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="inline-flex min-h-9 cursor-pointer items-center gap-2 border border-(--border-neutral) bg-transparent px-3 text-xs font-semibold text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red)"
                        onClick={() => setConfirmingLeave(true)}
                        type="button"
                      >
                        <LogOut size={14} aria-hidden="true" />
                        Quitter le club
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </Drawer>
    </section>
  );
}
