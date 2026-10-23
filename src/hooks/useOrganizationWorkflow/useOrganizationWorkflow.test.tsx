import { act, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import type { Session } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormEvent } from "react";
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

  it("refuse la création quand le nom d’organisation est déjà utilisé", async () => {
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [], error: null });
      }
      if (procedure === "create_organization") {
        return Promise.resolve({
          data: null,
          error: { message: "Organization name is already taken" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const navigate = vi.fn();
    const setModal = vi.fn();
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal,
      }),
    );

    await waitFor(() => expect(result.current.organizations).toEqual([]));
    act(() => {
      result.current.setOrganizationName("Les Panthères");
    });
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.createOrganization(event);
    });

    expect(supabaseRpc).toHaveBeenCalledWith("create_organization", {
      p_name: "Les Panthères",
      p_join_as_player: true,
    });
    expect(result.current.featureNotice).toBe(
      "Ce nom d’organisation est déjà utilisé. Choisissez-en un autre.",
    );
    expect(result.current.organizations).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    expect(setModal).not.toHaveBeenCalled();
  });

  it("redirige vers Organisation et ouvre la confirmation après une adhésion réussie", async () => {
    const member: OrganizationMember = {
      user_id: "user-1",
      display_name: "Alex Martin",
      role: "member",
    };
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "join_organization_by_code") {
        return Promise.resolve({
          data: [
            {
              organization_id: "organization-2",
              organization_name: "Les Bleus",
            },
          ],
          error: null,
        });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: [member], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const navigate = vi.fn();
    const setModal = vi.fn();
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal,
      }),
    );

    await waitFor(() =>
      expect(supabaseRpc).toHaveBeenCalledWith("get_my_organizations"),
    );
    act(() => {
      result.current.setJoinCode("A1B2C3D4");
    });
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.joinOrganization(event);
    });

    expect(navigate).toHaveBeenLastCalledWith("/app/organizations", {
      replace: true,
    });
    expect(setModal).toHaveBeenLastCalledWith("joined");
    expect(result.current.inviteOrganizationName).toBe("Les Bleus");
    expect(result.current.organizationMembers).toEqual([member]);
  });

  it("conserve l’organisation dans la liste si le chargement des membres échoue après l’adhésion", async () => {
    const joinedOrganization = {
      organization_id: "organization-2",
      organization_name: "Les Bleus",
    };
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "join_organization_by_code") {
        return Promise.resolve({ data: [joinedOrganization], error: null });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({
          data: null,
          error: { message: "Members could not be loaded" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const navigate = vi.fn();
    const setModal = vi.fn();
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal,
      }),
    );

    await waitFor(() =>
      expect(supabaseRpc).toHaveBeenCalledWith("get_my_organizations"),
    );
    act(() => {
      result.current.setJoinCode("A1B2C3D4");
    });
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.joinOrganization(event);
    });

    expect(result.current.organizationId).toBe(
      joinedOrganization.organization_id,
    );
    expect(result.current.organizations).toContainEqual({
      ...joinedOrganization,
      invite_code: "A1B2C3D4",
      role: "member",
      member_count: 1,
    });
    expect(result.current.featureNotice).toBe("Members could not be loaded");
    expect(navigate).not.toHaveBeenCalledWith("/app/organizations", {
      replace: true,
    });
    expect(setModal).not.toHaveBeenCalledWith("joined");
  });

  it("refuse une nouvelle adhésion avant le RPC si l’organisation est déjà connue", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "owner",
      member_count: 3,
    };
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [organization], error: null });
      }
      if (procedure === "join_organization_by_code") {
        return Promise.resolve({
          data: [
            {
              organization_id: organization.organization_id,
              organization_name: organization.organization_name,
            },
          ],
          error: null,
        });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const session = { user: { id: "user-1" } } as Session;
    const navigate = vi.fn();
    const setModal = vi.fn();
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal,
      }),
    );

    await waitFor(() =>
      expect(result.current.organizations).toEqual([organization]),
    );
    act(() => {
      result.current.setJoinCode(organization.invite_code);
    });
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.joinOrganization(event);
    });

    expect(result.current.organizations).toEqual([organization]);
    expect(result.current.featureNotice).toBe(
      "Vous faites déjà partie de cette organisation.",
    );
    expect(supabaseRpc).not.toHaveBeenCalledWith("join_organization_by_code", {
      p_code: organization.invite_code,
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(setModal).not.toHaveBeenCalled();
  });

  it("quitte la dernière organisation et redirige vers Matchs", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "member",
      member_count: 2,
    };
    const member: OrganizationMember = {
      user_id: "user-1",
      display_name: "Alex Martin",
      role: "member",
    };
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [organization], error: null });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: [member], error: null });
      }
      if (procedure === "leave_organization") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const navigate = vi.fn();
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal: vi.fn(),
      }),
    );

    await waitFor(() =>
      expect(result.current.organizationId).toBe(organization.organization_id),
    );
    let didLeave = false;
    await act(async () => {
      didLeave = await result.current.leaveOrganization();
    });

    expect(didLeave).toBe(true);
    expect(supabaseRpc).toHaveBeenCalledWith("leave_organization", {
      p_organization_id: organization.organization_id,
    });
    expect(navigate).toHaveBeenLastCalledWith("/app/matches", {
      replace: true,
    });
    expect(result.current.organizationId).toBeNull();
  });

  it("conserve l’organisation et affiche l’erreur si le départ échoue", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "member",
      member_count: 1,
    };
    const member: OrganizationMember = {
      user_id: "user-1",
      display_name: "Alex Martin",
      role: "member",
    };
    const navigate = vi.fn();
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [organization], error: null });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: [member], error: null });
      }
      if (procedure === "leave_organization") {
        return Promise.resolve({
          data: null,
          error: { message: "Organization membership required" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal: vi.fn(),
      }),
    );

    await waitFor(() =>
      expect(result.current.organizationMembers).toEqual([member]),
    );

    let didLeave = true;
    await act(async () => {
      didLeave = await result.current.leaveOrganization();
    });

    expect(didLeave).toBe(false);
    expect(result.current.organizationId).toBe(organization.organization_id);
    expect(result.current.organizationMembers).toEqual([member]);
    expect(result.current.leaveOrganizationNotice).toBe(
      "Organization membership required",
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it("affiche un message français quand le code d’invitation est inconnu", async () => {
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "join_organization_by_code") {
        return Promise.resolve({
          data: null,
          error: { message: "Invitation code not found" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const session = { user: { id: "user-1" } } as Session;
    const navigate = vi.fn();
    const setModal = vi.fn();
    const { result } = renderHook(() =>
      useOrganizationWorkflow({
        authLoading: false,
        session,
        pendingInviteCode: "",
        setPendingInviteCode: vi.fn(),
        setPendingCreateOrganization: vi.fn(),
        setAuthNotice: vi.fn(),
        setAuthMode: vi.fn(),
        navigate,
        setModal,
      }),
    );

    await waitFor(() =>
      expect(supabaseRpc).toHaveBeenCalledWith("get_my_organizations"),
    );
    act(() => {
      result.current.setJoinCode("BADCODE");
    });
    const event = {
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>;
    await act(async () => {
      await result.current.joinOrganization(event);
    });

    expect(result.current.featureNotice).toBe(
      "Ce code d’invitation est introuvable. Vérifiez-le puis réessayez.",
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(setModal).not.toHaveBeenCalled();
  });

  it("retire un membre via le RPC et actualise l’effectif", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "owner",
      member_count: 2,
    };
    const members: OrganizationMember[] = [
      { user_id: "user-1", display_name: "Alex Martin", role: "owner" },
      { user_id: "user-2", display_name: "Sam Lee", role: "member" },
    ];
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [organization], error: null });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: members, error: null });
      }
      if (procedure === "remove_organization_member") {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
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
    );

    await waitFor(() =>
      expect(result.current.organizationMembers).toHaveLength(2),
    );
    let removed = false;
    await act(async () => {
      removed = await result.current.removeOrganizationMember("user-2");
    });

    expect(removed).toBe(true);
    expect(supabaseRpc).toHaveBeenCalledWith("remove_organization_member", {
      p_organization_id: organization.organization_id,
      p_user_id: "user-2",
    });
    expect(result.current.organizationMembers).toEqual([members[0]]);
    expect(result.current.organizations[0].member_count).toBe(1);
  });

  it("conserve l’effectif et affiche l’erreur si le retrait échoue", async () => {
    const organization: OrganizationSummary = {
      organization_id: "organization-1",
      organization_name: "Les Panthères",
      invite_code: "A1B2C3D4",
      role: "owner",
      member_count: 2,
    };
    const members: OrganizationMember[] = [
      { user_id: "user-1", display_name: "Alex Martin", role: "owner" },
      { user_id: "user-2", display_name: "Sam Lee", role: "member" },
    ];
    supabaseRpc.mockImplementation((procedure: string) => {
      if (procedure === "get_my_organizations") {
        return Promise.resolve({ data: [organization], error: null });
      }
      if (procedure === "get_organization_members") {
        return Promise.resolve({ data: members, error: null });
      }
      if (procedure === "remove_organization_member") {
        return Promise.resolve({
          data: null,
          error: { message: "Organization owner required" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const session = { user: { id: "user-1" } } as Session;
    const { result } = renderHook(() =>
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
    );

    await waitFor(() =>
      expect(result.current.organizationMembers).toHaveLength(2),
    );
    let removed = true;
    await act(async () => {
      removed = await result.current.removeOrganizationMember("user-2");
    });

    expect(removed).toBe(false);
    expect(result.current.organizationMembers).toEqual(members);
    expect(result.current.organizations[0].member_count).toBe(2);
    expect(result.current.removeMemberNotice).toBe(
      "Organization owner required",
    );
  });
});
