import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";
import { MatchesPage } from "./MatchesPage";

describe("MatchesPage sans organisation", () => {
  it("invite le joueur à rejoindre une organisation avec un code", () => {
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
        name: "Rejoins une organisation pour accéder aux matchs",
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Rejoindre avec un code/ }),
    );
    expect(onJoinWithCode).toHaveBeenCalledOnce();
  });
});
