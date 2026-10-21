import type { FormEventHandler } from "react";
import { Check, Copy, Plus, UserRoundPlus } from "lucide-react";
import { DashboardDialog } from "../../components/DashboardDialog/DashboardDialog";
import type { DialogKind, OrganizationSummary } from "../../types";
import "./OrganizationDialogsContainer.css";

export type OrganizationDialogKind = Exclude<DialogKind, "match">;

export type OrganizationDialogsContainerProps = {
  kind: OrganizationDialogKind;
  organizations: OrganizationSummary[];
  activeOrganizationId: string | null;
  organizationName: string;
  joinAsPlayer: boolean;
  joinCode: string;
  inviteCode: string;
  inviteOrganizationName: string;
  inviteLink: string;
  featureNotice: string;
  copyNotice: string;
  onClose: () => void;
  onSelectOrganization: (organization: OrganizationSummary) => void;
  onOpenOrganizationCreation: () => void;
  onOpenJoinByCode: () => void;
  onOrganizationNameChange: (value: string) => void;
  onJoinAsPlayerChange: (value: boolean) => void;
  onCreateOrganization: FormEventHandler<HTMLFormElement>;
  onJoinCodeChange: (value: string) => void;
  onJoinOrganization: FormEventHandler<HTMLFormElement>;
  onCopyInviteLink: () => void;
  onCopyInviteCode: () => void;
};

export function OrganizationDialogsContainer({
  kind,
  organizations,
  activeOrganizationId,
  organizationName,
  joinAsPlayer,
  joinCode,
  inviteCode,
  inviteOrganizationName,
  inviteLink,
  featureNotice,
  copyNotice,
  onClose,
  onSelectOrganization,
  onOpenOrganizationCreation,
  onOpenJoinByCode,
  onOrganizationNameChange,
  onJoinAsPlayerChange,
  onCreateOrganization,
  onJoinCodeChange,
  onJoinOrganization,
  onCopyInviteLink,
  onCopyInviteCode,
}: OrganizationDialogsContainerProps) {
  return (
    <DashboardDialog kind={kind} onClose={onClose}>
      {kind === "organizations" ? (
        <div className="organization-dialog-actions grid gap-2.5">
          {organizations.length === 0 ? (
            <p className="mb-2 text-sm text-(--text-secondary)">
              Vous n’avez pas encore rejoint d’organisation.
            </p>
          ) : (
            <div className="mb-2 grid max-h-64 gap-2 overflow-y-auto">
              {organizations.map((item) => (
                <button
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-sm border px-3.5 text-left text-sm transition ${item.organization_id === activeOrganizationId ? "border-(--team-b-blue) bg-[#303541] text-white" : "border-(--border-neutral) bg-[#242630] text-(--text-secondary) hover:border-(--text-secondary) hover:text-white"}`}
                  key={item.organization_id}
                  onClick={() => onSelectOrganization(item)}
                  type="button"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-[7px] bg-(--bg-elevated) text-xs font-bold text-(--team-b-blue)">
                      {item.organization_name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="truncate font-semibold">
                      {item.organization_name}
                    </span>
                  </span>
                  {item.organization_id === activeOrganizationId && (
                    <Check
                      aria-label="Organisation active"
                      className="shrink-0 text-(--team-b-blue)"
                      size={16}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border border-(--border-neutral) bg-transparent text-sm font-semibold text-white hover:bg-[#343744]"
            onClick={onOpenOrganizationCreation}
            type="button"
          >
            <Plus size={16} /> Créer une organisation
          </button>
          <button
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border border-(--border-neutral) bg-transparent text-sm font-semibold text-white hover:bg-[#343744]"
            onClick={onOpenJoinByCode}
            type="button"
          >
            <UserRoundPlus size={16} /> Rejoindre une organisation
          </button>
        </div>
      ) : kind === "organization" ? (
        <form
          className="organization-dialog-form"
          onSubmit={onCreateOrganization}
        >
          <label htmlFor="organization-name">Nom de l'organisation</label>
          <input
            autoFocus
            id="organization-name"
            maxLength={80}
            minLength={2}
            onChange={(event) => onOrganizationNameChange(event.target.value)}
            placeholder="Ex. Les Panthères"
            required
            value={organizationName}
          />
          <label className="checkbox-field" htmlFor="join-as-player">
            <input
              checked={joinAsPlayer}
              id="join-as-player"
              onChange={(event) => onJoinAsPlayerChange(event.target.checked)}
              type="checkbox"
            />
            <span>M’ajouter comme joueur dans l’organisation</span>
          </label>
          <button className="organization-dialog-form__submit" type="submit">
            <Check size={17} /> Créer l’organisation
          </button>
        </form>
      ) : kind === "code" || kind === "join" ? (
        <form
          className="organization-dialog-form"
          onSubmit={onJoinOrganization}
        >
          {kind === "join" && (
            <p className="text-xs leading-1.5 text-(--text-secondary) [&>strong]:text-(--text-primary)">
              Vous allez rejoindre <strong>{inviteOrganizationName}</strong>.
            </p>
          )}
          <label htmlFor="organization-invite-code">Code d’invitation</label>
          <input
            autoFocus
            autoCapitalize="characters"
            id="organization-invite-code"
            maxLength={12}
            onChange={(event) =>
              onJoinCodeChange(event.target.value.toUpperCase())
            }
            placeholder="Ex. A1B2C3D4E5F6"
            required
            value={joinCode}
          />
          <button className="organization-dialog-form__submit" type="submit">
            <UserRoundPlus size={17} /> Rejoindre l’organisation
          </button>
        </form>
      ) : (
        <div className="organization-invite-content grid gap-2.5">
          <label htmlFor="organization-invite-link">Lien d’invitation</label>
          <input id="organization-invite-link" readOnly value={inviteLink} />
          <button
            className="organization-dialog-form__submit"
            onClick={onCopyInviteLink}
            type="button"
          >
            <Copy size={17} /> Copier le lien
          </button>
          <p className="mt-1 text-[11px] font-semibold text-(--text-secondary)">
            Ou partagez ce code
          </p>
          <div className="flex min-h-12 items-center justify-between gap-3 border border-(--border-neutral) bg-(--bg-surface) py-1.5 pr-2 pl-3">
            <strong className="text-lg tracking-[2px] text-(--team-b-blue)">
              {inviteCode}
            </strong>
            <button
              className="grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--border-neutral) bg-transparent"
              onClick={onCopyInviteCode}
              type="button"
              aria-label="Copier le code d’invitation"
            >
              <Copy size={16} />
            </button>
          </div>
          <p className="text-xs leading-1.5 text-(--text-secondary) [&>strong]:text-(--text-primary)">
            Invitation pour <strong>{inviteOrganizationName}</strong>
          </p>
        </div>
      )}
      {featureNotice && (
        <p
          className="my-3.5 wrap-anywhere text-[11px] leading-1.5 text-(--status-success)"
          role="status"
        >
          {featureNotice}
        </p>
      )}
      {copyNotice && (
        <p
          className="my-3.5 wrap-anywhere text-[11px] leading-1.5 text-(--status-success)"
          role="status"
        >
          {copyNotice}
        </p>
      )}
    </DashboardDialog>
  );
}
