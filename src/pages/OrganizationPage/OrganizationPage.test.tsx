import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";
import { OrganizationPage } from "./OrganizationPage";

describe("OrganizationPage sans club", () => {
  it("n’affiche pas l’invitation pendant le chargement des clubs", () => {
    const context = {
      organization: "",
      organizationId: null,
      isLoadingOrganizations: true,
    } as unknown as WorkspaceRouteContext;

    render(
      <MemoryRouter initialEntries={["/app/organizations"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="organizations" element={<OrganizationPage />} />
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

  it("affiche l’invitation à rejoindre un club", () => {
    const onJoinWithCode = vi.fn();
    const context = {
      organization: "",
      organizationId: null,
      onJoinWithCode,
    } as unknown as WorkspaceRouteContext;

    render(
      <MemoryRouter initialEntries={["/app/organizations"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="organizations" element={<OrganizationPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Rejoins un club pour accéder aux matchs",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Effectif du club" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Rejoindre avec un code/ }),
    );
    expect(onJoinWithCode).toHaveBeenCalledOnce();
  });
});
