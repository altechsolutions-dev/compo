import { renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationMember, OrganizationSummary } from "../../types";
import { useOrganizationWorkflow } from "./useOrganizationWorkflow";

const { supabaseRpc } = vi.hoisted(() => ({ supabaseRpc: vi.fn() }));

vi.mock("../../lib/supabase/supabase", () => ({
  supabase: { rpc: supabaseRpc },
}));

describe("useOrganizationWorkflow", () => {
  beforeEach(() => {
    supabaseRpc.mockReset();
  });

  it("charge les organisations et les membres via Supabase à la connexion", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "owner",
      member_count: 1,
    };
    const member: OrganizationMember = {
      user_id: "user-1",
      display_name: "Alex Martin",
      role: "owner",
    };
    supabaseRpc.mockImplementation((procedure: string) =>
      Promise.resolve(
        procedure === "get_my_organizations"
          ? { data: [organization], error: null }
          : { data: [member], error: null },
      ),
    );
    const session = { user: { id: "user-1" } } as Session;

    const { result } = renderHook(
      () =>
        useOrganizationWorkflow({
          authLoading: false,
          session,
          pendingInviteCode: "",
          setPendingInviteCode: vi.fn(),
          setPendingCreateOrganization: vi.fn(),
          setAuthNotice: vi.fn(),
          setAuthMode: vi.fn(),
          navigate: vi.fn(),
          setModal: vi.fn(),
        }),
      { wrapper: StrictMode },
    );

    await waitFor(() =>
      expect(result.current.organizationMembers).toEqual([member]),
    );

    expect(supabaseRpc).toHaveBeenCalledTimes(2);
    expect(supabaseRpc).toHaveBeenCalledWith("get_my_organizations");
    expect(supabaseRpc).toHaveBeenCalledWith("get_organization_members", {
      p_organization_id: organization.organization_id,
    });
    expect(result.current.organization).toBe(organization.organization_name);
    expect(result.current.organizationId).toBe(organization.organization_id);
  });
});
