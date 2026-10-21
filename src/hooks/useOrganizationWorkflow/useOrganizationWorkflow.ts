import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import type { NavigateFunction } from "react-router-dom";
import { readOrganization } from "../../data/readOrganization/readOrganization";
import { readOrganizationMembers } from "../../data/readOrganizationMembers/readOrganizationMembers";
import { supabase } from "../../lib/supabase/supabase";
import type {
  AuthMode,
  DialogKind,
  OrganizationMember,
  OrganizationSummary,
} from "../../types";

const pendingOrganizationRequests = new Map<string, Promise<unknown>>();

function deduplicateOrganizationRequest<T>(
  key: string,
  request: () => PromiseLike<T>,
): Promise<T> {
  const pending = pendingOrganizationRequests.get(key) as
    | Promise<T>
    | undefined;
  if (pending) return pending;

  const promise = Promise.resolve(request()).finally(() => {
    pendingOrganizationRequests.delete(key);
  });
  pendingOrganizationRequests.set(key, promise);
  return promise;
}

type UseOrganizationWorkflowOptions = {
  authLoading: boolean;
  session: Session | null;
  pendingInviteCode: string;
  setPendingInviteCode: (code: string) => void;
  setPendingCreateOrganization: (pending: boolean) => void;
  setAuthNotice: (notice: string) => void;
  setAuthMode: (mode: AuthMode) => void;
  navigate: NavigateFunction;
  setModal: (kind: DialogKind | null) => void;
};

export function useOrganizationWorkflow({
  authLoading,
  session,
  pendingInviteCode,
  setPendingInviteCode,
  setPendingCreateOrganization,
  setAuthNotice,
  setAuthMode,
  navigate,
  setModal,
}: UseOrganizationWorkflowOptions) {
  const [organization, setOrganization] = useState(() =>
    supabase ? "" : readOrganization(),
  );
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [organizationMembers, setOrganizationMembers] = useState(() =>
    supabase ? [] : readOrganizationMembers(),
  );
  const [organizationName, setOrganizationName] = useState("");
  const [joinOrganizationAsPlayer, setJoinOrganizationAsPlayer] =
    useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [inviteOrganizationName, setInviteOrganizationName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [featureNotice, setFeatureNotice] = useState(() =>
    new URLSearchParams(window.location.search).has("invite") && !supabase
      ? "Cette invitation nécessite la configuration Supabase de Compo."
      : "",
  );
  const [copyNotice, setCopyNotice] = useState("");
  const handledInviteCode = useRef("");
  const sessionUserId = session?.user.id ?? null;

  useEffect(() => {
    const client = supabase;
    if (!client || authLoading || !sessionUserId) return;
    let cancelled = false;

    void deduplicateOrganizationRequest(`organizations:${sessionUserId}`, () =>
      client.rpc("get_my_organizations"),
    ).then(async ({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setFeatureNotice(
          `Impossible de charger les organisations : ${error.message}`,
        );
        return;
      }

      const loadedOrganizations = (data ?? []) as OrganizationSummary[];
      setOrganizations(loadedOrganizations);
      const selected = loadedOrganizations[0];
      if (!selected) {
        setOrganization("");
        setOrganizationId(null);
        setInviteCode("");
        setOrganizationMembers([]);
        return;
      }

      setOrganization(selected.organization_name);
      setOrganizationId(selected.organization_id);
      setInviteCode(selected.invite_code);
      const { data: memberRows, error: membersError } =
        await deduplicateOrganizationRequest(
          `members:${selected.organization_id}`,
          () =>
            client.rpc("get_organization_members", {
              p_organization_id: selected.organization_id,
            }),
        );
      if (cancelled) return;
      if (membersError) {
        setFeatureNotice(membersError.message);
        return;
      }
      setOrganizationMembers((memberRows ?? []) as OrganizationMember[]);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, sessionUserId]);

  useEffect(() => {
    if (!pendingInviteCode || authLoading) return;
    if (!supabase || !sessionUserId) return;
    if (handledInviteCode.current === pendingInviteCode) return;
    handledInviteCode.current = pendingInviteCode;
    void supabase
      .rpc("preview_organization_invite", {
        p_code: pendingInviteCode.toUpperCase(),
      })
      .then(({ data, error }) => {
        const invite = (data?.[0] ?? null) as {
          organization_id: string;
          organization_name: string;
        } | null;
        if (error || !invite) {
          setFeatureNotice(
            error?.message ?? "Ce lien d’invitation est invalide.",
          );
          setModal("code");
          return;
        }
        setJoinCode(pendingInviteCode.toUpperCase());
        setInviteOrganizationName(invite.organization_name);
        setFeatureNotice("");
        setModal("join");
      });
  }, [authLoading, pendingInviteCode, sessionUserId, setModal]);

  async function selectOrganization(selected: OrganizationSummary) {
    if (!supabase) return;
    setOrganization(selected.organization_name);
    setOrganizationId(selected.organization_id);
    setInviteCode(selected.invite_code);
    setModal(null);
    setFeatureNotice("");
    const { data, error } = await supabase.rpc("get_organization_members", {
      p_organization_id: selected.organization_id,
    });
    if (error) {
      setFeatureNotice(error.message);
      return;
    }
    setOrganizationMembers((data ?? []) as OrganizationMember[]);
  }

  function openOrganizationCreation() {
    setOrganizationName("");
    setJoinOrganizationAsPlayer(true);
    setFeatureNotice("");
    if (!supabase) {
      setFeatureNotice(
        "Configurez Supabase pour créer une organisation partageable.",
      );
      setModal("organization");
      return;
    }
    if (!session) {
      setPendingCreateOrganization(true);
      setAuthNotice(
        "Connectez-vous ou créez un compte pour créer une organisation.",
      );
      setAuthMode("signup");
      navigate("/");
      setModal(null);
      return;
    }
    setModal("organization");
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = organizationName.trim();
    if (!name) return;
    if (!supabase || !session) {
      setFeatureNotice("Connectez-vous à Supabase pour créer l’organisation.");
      return;
    }

    setFeatureNotice("");
    const { data, error } = await supabase.rpc("create_organization", {
      p_name: name,
      p_join_as_player: joinOrganizationAsPlayer,
    });
    const created = (data?.[0] ?? null) as {
      organization_id: string;
      organization_name: string;
      invite_code: string;
    } | null;
    if (error || !created) {
      setFeatureNotice(error?.message ?? "La création a échoué.");
      return;
    }

    setOrganizations((current) => [
      {
        organization_id: created.organization_id,
        organization_name: created.organization_name,
        invite_code: created.invite_code,
        role: "owner",
        member_count: joinOrganizationAsPlayer ? 1 : 0,
      },
      ...current.filter(
        (item) => item.organization_id !== created.organization_id,
      ),
    ]);
    setOrganization(created.organization_name);
    setOrganizationId(created.organization_id);
    setInviteCode(created.invite_code);
    setInviteOrganizationName(created.organization_name);
    setJoinCode(created.invite_code);
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("invite", created.invite_code);
    setInviteLink(url.toString());
    const { data: memberRows, error: membersError } = await supabase.rpc(
      "get_organization_members",
      { p_organization_id: created.organization_id },
    );
    if (membersError) {
      setFeatureNotice(membersError.message);
      return;
    }
    setOrganizationMembers((memberRows ?? []) as OrganizationMember[]);
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete("create-organization");
    navigate(`${currentUrl.pathname}${currentUrl.search}`, { replace: true });
    setCopyNotice("");
    setModal("invite");
  }

  async function joinOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    if (!supabase) {
      setFeatureNotice("Configurez Supabase pour rejoindre une organisation.");
      return;
    }
    if (!session) {
      setPendingInviteCode(code);
      setAuthNotice(
        "Connectez-vous ou créez un compte pour rejoindre l’organisation.",
      );
      setAuthMode("login");
      navigate("/");
      setModal(null);
      return;
    }

    setFeatureNotice("");
    const { data: joinedRows, error } = await supabase.rpc(
      "join_organization_by_code",
      { p_code: code },
    );
    const joined = (joinedRows?.[0] ?? null) as {
      organization_id: string;
      organization_name: string;
    } | null;
    if (error || !joined) {
      setFeatureNotice(error?.message ?? "Code d’invitation introuvable.");
      return;
    }

    setOrganizations((current) => [
      {
        organization_id: joined.organization_id,
        organization_name: joined.organization_name,
        invite_code: code,
        role: "member",
        member_count: 1,
      },
      ...current.filter(
        (item) => item.organization_id !== joined.organization_id,
      ),
    ]);
    setOrganization(joined.organization_name);
    setOrganizationId(joined.organization_id);
    setInviteCode(code);
    const { data: memberRows, error: membersError } = await supabase.rpc(
      "get_organization_members",
      { p_organization_id: joined.organization_id },
    );
    if (membersError) {
      setFeatureNotice(membersError.message);
      return;
    }
    setOrganizationMembers((memberRows ?? []) as OrganizationMember[]);
    setPendingInviteCode("");
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    navigate(`${url.pathname}${url.search}`, { replace: true });
    setFeatureNotice("");
    setModal(null);
    navigate("/app/matches", { replace: true });
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(`${label} copié.`);
    } catch {
      setCopyNotice(
        "La copie automatique a échoué. Sélectionnez le texte pour le copier.",
      );
    }
  }

  function openInviteDialog(name: string, code: string) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("invite", code);
    setInviteLink(url.toString());
    setInviteOrganizationName(name);
    setCopyNotice("");
    setFeatureNotice("");
    setModal("invite");
  }

  function clearOrganizationSession() {
    setOrganizationId(null);
    setInviteCode("");
    setOrganizationMembers([]);
  }

  return {
    organization,
    organizationId,
    organizations,
    inviteCode,
    organizationMembers,
    organizationName,
    setOrganizationName,
    joinOrganizationAsPlayer,
    setJoinOrganizationAsPlayer,
    joinCode,
    setJoinCode,
    inviteOrganizationName,
    inviteLink,
    featureNotice,
    copyNotice,
    setFeatureNotice,
    selectOrganization,
    openOrganizationCreation,
    createOrganization,
    joinOrganization,
    copyText,
    openInviteDialog,
    clearOrganizationSession,
  };
}
