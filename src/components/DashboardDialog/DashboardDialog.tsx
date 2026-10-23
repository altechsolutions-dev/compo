import type { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { DialogKind } from "../../types";
import "./DashboardDialog.css";

export type DashboardDialogProps = {
  kind: DialogKind;
  children: ReactNode;
  onClose: () => void;
};

const dialogTitles: Record<DialogKind, string> = {
  match: "Nouveau créneau",
  organization: "Créer une organisation",
  organizations: "Mes organisations",
  invite: "Inviter des joueurs",
  join: "Rejoindre l’organisation",
  code: "Rejoindre avec un code",
  joined: "Bienvenue dans l’organisation",
};

const dialogEyebrows: Record<DialogKind, string> = {
  match: "ORGANISATION",
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
  onClose,
}: DashboardDialogProps) {
  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return createPortal(
    <div
      className="dashboard-dialog fixed inset-0 z-5 grid place-items-center bg-[#11151fcc] p-5"
      role="presentation"
      onMouseDown={closeOnBackdrop}
    >
      <section
        className="dashboard-dialog__panel w-full max-w-107.5 border border-(--border-neutral) bg-(--bg-elevated) p-6.25 text-(--text-primary) shadow-[0_18px_50px_#17271f30]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-5.75 flex items-center justify-between gap-5">
          <div>
            <p className="mb-1.75 text-[10px] font-bold tracking-[1.7px] text-(--muted)">
              {dialogEyebrows[kind]}
            </p>
            <h2
              className="mb-0 font-sans text-2xl font-normal"
              id="modal-title"
            >
              {dialogTitles[kind]}
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
      </section>
    </div>,
    document.body,
  );
}
