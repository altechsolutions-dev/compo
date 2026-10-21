import { CreateMatchDialogContainer } from "../../containers/CreateMatchDialogContainer/CreateMatchDialogContainer";
import type { CreateMatchDialogContainerProps } from "../../containers/CreateMatchDialogContainer/CreateMatchDialogContainer";
import {
  OrganizationDialogsContainer,
  type OrganizationDialogsContainerProps,
} from "../../containers/OrganizationDialogsContainer/OrganizationDialogsContainer";
import type { DialogKind } from "../../types";
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
  if (!kind) return null;

  return (
    <div className="modal-manager">
      {kind === "match" ? (
        <CreateMatchDialogContainer {...matchDialog} />
      ) : (
        <OrganizationDialogsContainer {...organizationDialog} kind={kind} />
      )}
    </div>
  );
}
