import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

vi.mock("../../lib/supabase/supabase", () => ({
  initialAuthCallbackMessage: "",
  supabase: null,
}));

describe("useAuth", () => {
  it("initialise une session anonyme avec le formulaire de connexion", () => {
    const { result } = renderHook(
      () => useAuth({ onCreateOrganizationIntent: vi.fn() }),
      { wrapper: MemoryRouter },
    );

    expect(result.current.session).toBeNull();
    expect(result.current.authLoading).toBe(false);
    expect(result.current.authMode).toBe("login");
  });

  it("signale une configuration absente au moment de la connexion", async () => {
    const { result } = renderHook(
      () => useAuth({ onCreateOrganizationIntent: vi.fn() }),
      { wrapper: MemoryRouter },
    );
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
