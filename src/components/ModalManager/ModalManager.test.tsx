import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModalManager } from "./ModalManager";

function createProps(kind: "match" | "organizations" | null) {
  return {
    kind,
    matchDialog: {
      date: "2030-06-15",
      minDate: "2030-06-14",
      time: "19:30",
      venue: "",
      maxPlayers: 10,
      joinOnCreate: true,
      saving: false,
      onClose: vi.fn(),
      onDateChange: vi.fn(),
      onTimeChange: vi.fn(),
      onVenueChange: vi.fn(),
      onMaxPlayersChange: vi.fn(),
      onJoinOnCreateChange: vi.fn(),
      onSubmit: vi.fn(),
    },
    organizationDialog: {
      organizations: [],
      activeOrganizationId: null,
      organizationName: "",
      joinAsPlayer: true,
      joinCode: "",
      inviteCode: "",
      inviteOrganizationName: "",
      inviteLink: "",
      featureNotice: "",
      copyNotice: "",
      onClose: vi.fn(),
      onSelectOrganization: vi.fn(),
      onOpenOrganizationCreation: vi.fn(),
      onOpenJoinByCode: vi.fn(),
      onOrganizationNameChange: vi.fn(),
      onJoinAsPlayerChange: vi.fn(),
      onCreateOrganization: vi.fn(),
      onJoinCodeChange: vi.fn(),
      onJoinOrganization: vi.fn(),
      onCopyInviteLink: vi.fn(),
      onCopyInviteCode: vi.fn(),
    },
  };
}

describe("ModalManager", () => {
  it("n’affiche aucune modale quand aucune n’est sélectionnée", () => {
    const { container } = render(<ModalManager {...createProps(null)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("monte le formulaire de création de match selon le type sélectionné", () => {
    render(<ModalManager {...createProps("match")} />);
    expect(screen.getByLabelText("Date du match")).toBeVisible();
    expect(screen.getByLabelText("Terrain")).toBeVisible();
  });

  it("délègue les modales de club au conteneur dédié", () => {
    render(<ModalManager {...createProps("organizations")} />);
    expect(
      screen.getByText("Vous n’avez pas encore rejoint de club."),
    ).toBeVisible();
  });
});
