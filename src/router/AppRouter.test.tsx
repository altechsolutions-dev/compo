import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppRouter } from "./AppRouter";

vi.mock("../pages/WorkspaceLayout/WorkspaceLayout", () => ({
  WorkspaceLayout: () => {
    const location = useLocation();
    return (
      <>
        <output data-testid="location">
          {location.pathname}
          {location.search}
        </output>
        <Outlet />
      </>
    );
  },
}));

vi.mock("../pages/MatchesPage/MatchesPage", () => ({
  MatchesPage: () => <div>Matches</div>,
}));

vi.mock("../pages/OrganizationPage/OrganizationPage", () => ({
  OrganizationPage: () => <div>Organisations</div>,
}));

function LoginLocation() {
  const location = useLocation();
  return (
    <output data-testid="login-location">
      {location.pathname}
      {location.search}
    </output>
  );
}

describe("AppRouter", () => {
  it("conserve le code d’invitation lors de la redirection d’une session active", async () => {
    render(
      <MemoryRouter initialEntries={["/?invite=ABC123"]}>
        <AppRouter
          authLoading={false}
          isConnected
          hasSupabase
          loginPage={null}
          consentPage={null}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/app/matches?invite=ABC123",
      );
    });
  });

  it("conserve le code d’invitation lorsque la garde renvoie vers la connexion", async () => {
    render(
      <MemoryRouter initialEntries={["/app/matches?invite=ABC123"]}>
        <AppRouter
          authLoading={false}
          isConnected={false}
          hasSupabase
          loginPage={<LoginLocation />}
          consentPage={null}
        />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("login-location")).toHaveTextContent(
        "/?invite=ABC123",
      );
    });
  });
});
