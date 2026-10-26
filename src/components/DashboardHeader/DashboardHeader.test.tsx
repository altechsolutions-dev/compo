import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardHeader } from "./DashboardHeader";

function renderHeader() {
  const callbacks = {
    onNavigate: vi.fn(),
    onChooseOrganization: vi.fn(),
    onSignOut: vi.fn(),
    onInstall: vi.fn(),
  };
  render(
    <MemoryRouter>
      <DashboardHeader
        organization="Les Panthères"
        organizationMemberCount={8}
        activeView="matches"
        isSignedIn
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

  it("transmet les actions de sélection, installation et déconnexion", () => {
    const callbacks = renderHeader();

    fireEvent.click(screen.getByRole("button", { name: "Choisir un club" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(screen.getByText("Déconnexion")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Installer Compo" }));

    expect(callbacks.onChooseOrganization).toHaveBeenCalledOnce();
    expect(callbacks.onSignOut).toHaveBeenCalledOnce();
    expect(callbacks.onInstall).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Partager le lien d’invitation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rejoindre un club avec un code" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Enregistrer une passkey" }),
    ).not.toBeInTheDocument();
  });
});
