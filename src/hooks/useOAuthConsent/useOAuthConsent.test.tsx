import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useOAuthConsent } from "./useOAuthConsent";

vi.mock("../../lib/supabase/supabase", () => ({
  supabase: null,
}));

describe("useOAuthConsent", () => {
  it("explique que le consentement ne peut pas fonctionner sans Supabase", () => {
    const { result } = renderHook(() =>
      useOAuthConsent({
        authorizationId: "request-1",
        enabled: true,
        authLoading: false,
        session: null,
      }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.routeError).toContain("n’est pas configuré");
    expect(result.current.consent).toBeNull();
  });

  it("signale une demande absente", () => {
    const { result } = renderHook(() =>
      useOAuthConsent({
        authorizationId: null,
        enabled: true,
        authLoading: false,
        session: null,
      }),
    );

    expect(result.current.routeError).toContain("Aucune demande OAuth");
  });
});
