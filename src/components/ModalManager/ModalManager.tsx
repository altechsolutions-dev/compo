import { useEffect, useState } from "react";
import { CreateMatchDialogContainer } from "../../containers/CreateMatchDialogContainer/CreateMatchDialogContainer";
import type { CreateMatchDialogContainerProps } from "../../containers/CreateMatchDialogContainer/CreateMatchDialogContainer";
import {
  OrganizationDialogsContainer,
  type OrganizationDialogsContainerProps,
} from "../../containers/OrganizationDialogsContainer/OrganizationDialogsContainer";
import type { DialogKind } from "../../types";
import { useDrawerTransition } from "../../hooks/useDrawerTransition/useDrawerTransition";
import "./ModalManager.css";

export type ModalManagerProps = {
  kind: DialogKind | null;
  matchDialog: CreateMatchDialogContainerProps;
  organizationDialog: Omit<OrganizationDialogsContainerProps, "kind">;
};

export function ModalManager({
  kind,
  matchDialog,
  organizationDialog,
}: ModalManagerProps) {
  const transition = useDrawerTransition(Boolean(kind));
  const [retainedKind, setRetainedKind] = useState<DialogKind | null>(null);

  if (kind && retainedKind !== kind) setRetainedKind(kind);

  const displayedKind = kind ?? retainedKind;

  useEffect(() => {
    if (kind || !retainedKind) return;
    const timer = window.setTimeout(() => setRetainedKind(null), 300);
    return () => window.clearTimeout(timer);
  }, [kind, retainedKind]);

  if (!displayedKind || !transition.mounted) return null;

  return (
    <div className="modal-manager">
      {displayedKind === "match" ? (
        <CreateMatchDialogContainer
          {...matchDialog}
          mounted={transition.mounted}
          open={transition.open}
        />
      ) : (
        <OrganizationDialogsContainer
          {...organizationDialog}
          kind={displayedKind}
          mounted={transition.mounted}
          open={transition.open}
        />
      )}
    </div>
  );
}
