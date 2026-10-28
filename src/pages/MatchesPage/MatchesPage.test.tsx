import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";
import { MatchesPage } from "./MatchesPage";

describe("MatchesPage sans club", () => {
  it("ouvre le match ciblé par un lien de notification", async () => {
    const onOpenMatch = vi.fn();
    const context = {
      organization: "",
      organizationId: null,
      isLoadingOrganizations: false,
      allMatches: [{ id: "match-finished", status: "finished" }],
      onOpenMatch,
    } as unknown as WorkspaceRouteContext;

    render(
      <MemoryRouter initialEntries={["/app/matches?match=match-finished"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="matches" element={<MatchesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(onOpenMatch).toHaveBeenCalledWith("match-finished"),
    );
    expect(onOpenMatch).toHaveBeenCalledOnce();
  });

  it("n’affiche pas l’invitation pendant le chargement des clubs", () => {
    const context = {
      organization: "",
      organizationId: null,
      isLoadingOrganizations: true,
    } as unknown as WorkspaceRouteContext;

    render(
      <MemoryRouter initialEntries={["/app/matches"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="matches" element={<MatchesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement de votre club",
    );
    expect(
      screen.queryByRole("heading", {
        name: "Rejoins un club pour accéder aux matchs",
      }),
    ).not.toBeInTheDocument();
  });

  it("invite le joueur à rejoindre un club avec un code", () => {
    const onJoinWithCode = vi.fn();
    const context = {
      organization: "",
      organizationId: null,
      onJoinWithCode,
    } as unknown as WorkspaceRouteContext;

    render(
      <MemoryRouter initialEntries={["/app/matches"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="matches" element={<MatchesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Rejoins un club pour accéder aux matchs",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Rejoindre avec un code/ }),
    );
    expect(onJoinWithCode).toHaveBeenCalledOnce();
  });
});
