import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer } from "../Drawer/Drawer";
import type { DialogKind } from "../../types";
import "./DashboardDialog.css";

export type DashboardDialogProps = {
  kind: DialogKind;
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  mounted?: boolean;
  open?: boolean;
  onClose: () => void;
};

const dialogTitles: Record<DialogKind, string> = {
  match: "Nouveau créneau",
  organization: "Créer un club",
  organizations: "Mes clubs",
  invite: "Inviter des joueurs",
  join: "Rejoindre le club",
  code: "Rejoindre avec un code",
  joined: "Bienvenue dans le club",
};

const dialogEyebrows: Record<DialogKind, string> = {
  match: "CLUB",
  organization: "NOUVELLE ÉQUIPE",
  organizations: "MES ÉQUIPES",
  invite: "INVITATION COMPO",
  join: "INVITATION COMPO",
  code: "INVITATION COMPO",
  joined: "ADHÉSION CONFIRMÉE",
};

export function DashboardDialog({
  kind,
  children,
  title,
  eyebrow,
  mounted = true,
  open = true,
  onClose,
}: DashboardDialogProps) {
  return (
    <Drawer
      mounted={mounted}
      open={open}
      onClose={onClose}
      labelledBy="modal-title"
      panelClassName={`dashboard-dialog__panel ${kind === "match" ? "dashboard-dialog__panel--match" : ""}`}
      backdropClassName="z-50"
      panelId="dashboard-dialog-panel"
    >
      <div className="dashboard-dialog__content">
        <div className="mb-5.75 flex items-center justify-between gap-5">
          <div>
            <p className="drawer-eyebrow mb-1.75">
              {eyebrow ?? dialogEyebrows[kind]}
            </p>
            <h2 className="drawer-title mb-0" id="modal-title">
              {title ?? dialogTitles[kind]}
            </h2>
          </div>
          <button
            className="dashboard-dialog__close grid size-9 cursor-pointer place-items-center rounded-[3px] border border-(--border-neutral) bg-transparent"
            onClick={onClose}
            type="button"
            aria-label="Fermer"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </Drawer>
  );
}
