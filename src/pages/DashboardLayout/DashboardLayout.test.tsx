import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "./DashboardLayout";

describe("DashboardLayout", () => {
  it("propose d’activer la connexion biométrique après la connexion et permet de reporter", () => {
    const onRegisterPasskey = vi.fn();
    const onDismissPasskeyPrompt = vi.fn();
    render(
      <MemoryRouter initialEntries={["/app/matches"]}>
        <Routes>
          <Route
            path="/app/*"
            element={
              <DashboardLayout
                organization="Les Panthères"
                organizationMemberCount={4}
                isSignedIn
                canInstall={false}
                onNavigate={vi.fn()}
                onChooseOrganization={vi.fn()}
                onSignOut={vi.fn()}
                onRegisterPasskey={onRegisterPasskey}
                passkeySubmitting={false}
                passkeyPromptOpen
                onDismissPasskeyPrompt={onDismissPasskeyPrompt}
                passkeyNotice=""
                onInstall={vi.fn()}
                isSynchronized
              >
                <div />
              </DashboardLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Active Face ID ou l’empreinte" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Activer" }));
    fireEvent.click(screen.getByRole("button", { name: "Plus tard" }));

    expect(onRegisterPasskey).toHaveBeenCalledOnce();
    expect(onDismissPasskeyPrompt).toHaveBeenCalledOnce();
  });

  it("affiche la page Matchs et propose la navigation vers le club", () => {
    render(
      <MemoryRouter initialEntries={["/app/matches"]}>
        <Routes>
          <Route
            path="/app/*"
            element={
              <DashboardLayout
                organization="Les Panthères"
                organizationMemberCount={4}
                isSignedIn
                canInstall={false}
                onNavigate={vi.fn()}
                onChooseOrganization={vi.fn()}
                onSignOut={vi.fn()}
                onRegisterPasskey={vi.fn()}
                passkeySubmitting={false}
                passkeyPromptOpen={false}
                onDismissPasskeyPrompt={vi.fn()}
                passkeyNotice=""
                onInstall={vi.fn()}
                isSynchronized
              >
                <div />
              </DashboardLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: /Matchs/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: /Club/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("sélectionne l’onglet En direct sur sa route", () => {
    render(
      <MemoryRouter initialEntries={["/app/live"]}>
        <Routes>
          <Route
            path="/app/*"
            element={
              <DashboardLayout
                organization="Les Panthères"
                organizationMemberCount={4}
                isSignedIn
                canInstall={false}
                onNavigate={vi.fn()}
                onChooseOrganization={vi.fn()}
                onSignOut={vi.fn()}
                onRegisterPasskey={vi.fn()}
                passkeySubmitting={false}
                passkeyPromptOpen={false}
                onDismissPasskeyPrompt={vi.fn()}
                passkeyNotice=""
                onInstall={vi.fn()}
                isSynchronized
              >
                <div />
              </DashboardLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "En direct" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
