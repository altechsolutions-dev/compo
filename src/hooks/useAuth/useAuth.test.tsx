import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storePendingInviteCode } from "../../lib/pendingInvite/pendingInvite";
import { getAuthenticatedDestination, useAuth } from "./useAuth";

vi.mock("../../lib/supabase/supabase", () => ({
  initialAuthCallbackMessage: "",
  supabase: null,
}));

describe("useAuth", () => {
  afterEach(() => localStorage.clear());

  it("garde le code mémorisé si la query a déjà disparu", () => {
    expect(getAuthenticatedDestination("", "ABC123")).toBe(
      "/app/matches?invite=ABC123",
    );
  });

  it("initialise une session anonyme avec le formulaire de connexion", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter });

    expect(result.current.session).toBeNull();
    expect(result.current.authLoading).toBe(false);
    expect(result.current.authMode).toBe("login");
  });

  it("restaure le code sauvegardé dans l’URL après un callback sans query", async () => {
    function AuthLocation() {
      useAuth();
      const location = useLocation();
      return (
        <output data-testid="location">
          {location.pathname}
          {location.search}
        </output>
      );
    }

    storePendingInviteCode("ABC123");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthLocation />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/?invite=ABC123",
      );
    });
  });

  it("signale une configuration absente au moment de la connexion", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: MemoryRouter });
    const form = document.createElement("form");
    const preventDefault = vi.fn();

    await act(() =>
      result.current.submitAuth({
        preventDefault,
        currentTarget: form,
      } as never),
    );

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.authNotice).toContain("n’est pas configuré");
  });
});
