import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "./DashboardHeader";

function renderHeader() {
  const callbacks = {
    onNavigate: vi.fn(),
    onChooseOrganization: vi.fn(),
    onShareInvite: vi.fn(),
    onJoinWithCode: vi.fn(),
    onSignOut: vi.fn(),
    onInstall: vi.fn(),
  };
  render(
    <MemoryRouter>
      <DashboardHeader
        organization="Les Panthères"
        organizationMemberCount={8}
        activeView="matches"
        avatarLabel="AM"
        isSignedIn
        canShareInvite
        canInstall
        {...callbacks}
      />
    </MemoryRouter>,
  );
  return callbacks;
}

describe("DashboardHeader", () => {
  it("affiche les onglets et transmet la navigation", () => {
    const { onNavigate } = renderHeader();

    expect(screen.getByRole("tab", { name: "Matchs" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "En direct" }));
    expect(onNavigate).toHaveBeenCalledWith("live");
    fireEvent.click(screen.getByRole("tab", { name: /Club/ }));
    expect(onNavigate).toHaveBeenCalledWith("organization");
  });

  it("transmet les actions de partage, sélection, installation et déconnexion", () => {
    const callbacks = renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Choisir un club" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Partager le lien d’invitation" }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Rejoindre un club avec un code",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    fireEvent.click(screen.getByRole("button", { name: "Installer Compo" }));

    expect(callbacks.onChooseOrganization).toHaveBeenCalledOnce();
    expect(callbacks.onShareInvite).toHaveBeenCalledOnce();
    expect(callbacks.onJoinWithCode).toHaveBeenCalledOnce();
    expect(callbacks.onSignOut).toHaveBeenCalledOnce();
    expect(callbacks.onInstall).toHaveBeenCalledOnce();
  });
});
