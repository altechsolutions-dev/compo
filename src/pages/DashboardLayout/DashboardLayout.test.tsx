import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DashboardLayout } from "./DashboardLayout";

describe("DashboardLayout", () => {
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
                avatarLabel="AM"
                isSignedIn
                canShareInvite
                canInstall={false}
                onNavigate={vi.fn()}
                onChooseOrganization={vi.fn()}
                onShareInvite={vi.fn()}
                onJoinWithCode={vi.fn()}
                onSignOut={vi.fn()}
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
                avatarLabel="AM"
                isSignedIn
                canShareInvite
                canInstall={false}
                onNavigate={vi.fn()}
                onChooseOrganization={vi.fn()}
                onShareInvite={vi.fn()}
                onJoinWithCode={vi.fn()}
                onSignOut={vi.fn()}
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
