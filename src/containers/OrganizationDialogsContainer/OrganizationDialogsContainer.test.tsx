import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrganizationDialogsContainer } from "./OrganizationDialogsContainer";
import type { OrganizationSummary } from "../../types";

const organization: OrganizationSummary = {
  organization_id: "org-1",
  organization_name: "Les Panthères",
  invite_code: "ABC123",
  role: "owner",
  member_count: 5,
};

function createProps(
  kind: "organizations" | "organization" | "join" | "code" | "invite",
) {
  return {
    kind,
    organizations: [organization],
    activeOrganizationId: "org-1",
    organizationName: "",
    joinAsPlayer: true,
    joinCode: "ABC123",
    inviteCode: "ABC123",
    inviteOrganizationName: "Les Panthères",
    inviteLink: "https://compo.example/?invite=ABC123",
    featureNotice: "",
    copyNotice: "",
    onClose: vi.fn(),
    onSelectOrganization: vi.fn(),
    onOpenOrganizationCreation: vi.fn(),
    onOpenJoinByCode: vi.fn(),
    onOrganizationNameChange: vi.fn(),
    onJoinAsPlayerChange: vi.fn(),
    onCreateOrganization: vi.fn((event) => event.preventDefault()),
    onJoinCodeChange: vi.fn(),
    onJoinOrganization: vi.fn((event) => event.preventDefault()),
    onCopyInviteLink: vi.fn(),
    onCopyInviteCode: vi.fn(),
  };
}

describe("OrganizationDialogsContainer", () => {
  it("affiche et transmet la sélection d’organisation", () => {
    const props = createProps("organizations");
    render(<OrganizationDialogsContainer {...props} />);

    fireEvent.click(screen.getByRole("button", { name: /Les Panthères/ }));
    expect(props.onSelectOrganization).toHaveBeenCalledWith(organization);
  });

  it("affiche le formulaire de création et transmet les changements", () => {
    const props = createProps("organization");
    render(<OrganizationDialogsContainer {...props} />);

    fireEvent.change(screen.getByLabelText("Nom de l'organisation"), {
      target: { value: "Les Bleus" },
    });
    fireEvent.click(
      screen.getByLabelText("M’ajouter comme joueur dans l’organisation"),
    );
    expect(props.onOrganizationNameChange).toHaveBeenCalledWith("Les Bleus");
    expect(props.onJoinAsPlayerChange).toHaveBeenCalledWith(false);
  });

  it("permet de copier le lien ou le code d’invitation", () => {
    const props = createProps("invite");
    render(<OrganizationDialogsContainer {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Copier le code d’invitation" }),
    );
    expect(props.onCopyInviteLink).toHaveBeenCalledOnce();
    expect(props.onCopyInviteCode).toHaveBeenCalledOnce();
  });
});
