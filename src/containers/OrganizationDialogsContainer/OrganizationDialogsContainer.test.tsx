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
  kind:
    | "organizations"
    | "organization"
    | "join"
    | "code"
    | "invite"
    | "joined",
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

  it("ne marque pas le code vide invalide avant la soumission", () => {
    const props = { ...createProps("code"), joinCode: "" };
    render(<OrganizationDialogsContainer {...props} />);

    const input = screen.getByLabelText("Code d’invitation");
    expect(input).toHaveAttribute("aria-required", "true");
    expect((input as HTMLInputElement).validity.valueMissing).toBe(false);
  });

  it("affiche une erreur et n’envoie pas le formulaire si le code est vide", () => {
    const props = { ...createProps("code"), joinCode: "" };
    render(<OrganizationDialogsContainer {...props} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Rejoindre l’organisation" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saisissez un code d’invitation.",
    );
    expect(screen.getByLabelText("Code d’invitation")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(props.onJoinOrganization).not.toHaveBeenCalled();
  });

  it("affiche les erreurs d’adhésion comme des alertes, pas des succès", () => {
    const props = {
      ...createProps("code"),
      featureNotice: 'column reference "organization_id" is ambiguous',
    };
    render(<OrganizationDialogsContainer {...props} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      'column reference "organization_id" is ambiguous',
    );
    expect(screen.getByRole("alert")).toHaveClass("text-(--team-a-red)");
  });

  it("confirme l’adhésion et permet d’ouvrir l’organisation", () => {
    const props = createProps("joined");
    render(<OrganizationDialogsContainer {...props} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu as rejoint Les Panthères.",
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Voir l’organisation" }),
    );
    expect(props.onClose).toHaveBeenCalledOnce();
  });
});
