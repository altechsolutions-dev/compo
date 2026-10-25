import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { authErrorMessage } from "../../lib/authErrorMessage/authErrorMessage";
import {
  initialAuthCallbackMessage,
  supabase,
} from "../../lib/supabase/supabase";
import {
  readRememberSession,
  saveRememberSession,
} from "../../lib/supabase/authStorage";
import {
  readPendingInviteCode,
  storePendingInviteCode,
} from "../../lib/pendingInvite/pendingInvite";
import type { AuthMode } from "../../types";

const passkeyOfferStorageKey = "compo:offer-passkey-after-sign-in";
const passkeyRegisteredStoragePrefix = "compo:passkey-registered:";

function passkeyRegisteredStorageKey(userId: string) {
  return `${passkeyRegisteredStoragePrefix}${userId}`;
}

export function getAuthenticatedDestination(
  search: string,
  pendingInviteCode = "",
) {
  const inviteCode =
    new URLSearchParams(search).get("invite")?.trim() ||
    pendingInviteCode.trim();
  return inviteCode
    ? `/app/matches?invite=${encodeURIComponent(inviteCode)}`
    : "/app/matches";
}

export function shouldOfferPasskey(isRegisteredOnDevice: boolean) {
  return !isRegisteredOnDevice;
}

export function useAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const handledCreateIntent = useRef(false);
  const inviteFromLocation =
    new URLSearchParams(location.search).get("invite")?.trim() ?? "";
  const initialPendingInviteCode =
    inviteFromLocation || readPendingInviteCode();

  locationRef.current = location;

  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    const query = new URLSearchParams(location.search);
    if (initialAuthCallbackMessage) return "login";
    if (query.has("create-organization")) return "signup";
    return "login";
  });
  const [authNotice, setAuthNotice] = useState(
    () =>
      initialAuthCallbackMessage ||
      (initialPendingInviteCode
        ? "Connectez-vous ou créez un compte pour rejoindre le club."
        : location.pathname === "/oauth/consent" &&
            new URLSearchParams(location.search).has("authorization_id")
          ? "Connectez-vous pour examiner cette demande d’autorisation."
          : ""),
  );
  const [authNoticeKind, setAuthNoticeKind] = useState<"error" | "success">(
    initialAuthCallbackMessage ? "error" : "success",
  );
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);
  const [passkeyNotice, setPasskeyNotice] = useState("");
  const [passkeyPromptOpen, setPasskeyPromptOpen] = useState(false);
  const [rememberSession, setRememberSessionState] =
    useState(readRememberSession);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [pendingCreateOrganization, setPendingCreateOrganization] = useState(
    () => new URLSearchParams(location.search).has("create-organization"),
  );
  const [createOrganizationIntentReady, setCreateOrganizationIntentReady] =
    useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(
    () => initialPendingInviteCode,
  );

  function setRememberSession(remember: boolean) {
    saveRememberSession(remember);
    setRememberSessionState(remember);
  }

  useEffect(() => {
    if (!pendingInviteCode) {
      storePendingInviteCode("");
      return;
    }

    storePendingInviteCode(pendingInviteCode);
    const currentLocation = locationRef.current;
    const search = new URLSearchParams(currentLocation.search);
    if (search.get("invite")?.trim() === pendingInviteCode) return;

    search.set("invite", pendingInviteCode);
    navigate(
      `${currentLocation.pathname}?${search.toString()}${currentLocation.hash}`,
      { replace: true },
    );
  }, [
    location.hash,
    location.pathname,
    location.search,
    navigate,
    pendingInviteCode,
  ]);

  useEffect(() => {
    if (!initialAuthCallbackMessage) return;
    navigate(`${locationRef.current.pathname}${locationRef.current.search}`, {
      replace: true,
    });
  }, [navigate]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    const createIntent = new URLSearchParams(locationRef.current.search).has(
      "create-organization",
    );

    const completeCreateIntent = (nextSession: Session | null) => {
      if (!nextSession || !createIntent || handledCreateIntent.current) return;
      handledCreateIntent.current = true;
      setPendingCreateOrganization(false);
      setCreateOrganizationIntentReady(true);
      navigate(
        getAuthenticatedDestination(
          locationRef.current.search,
          pendingInviteCode,
        ),
        { replace: true },
      );
    };

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      if (
        data.session &&
        locationRef.current.pathname === "/" &&
        !createIntent
      ) {
        navigate(
          getAuthenticatedDestination(
            locationRef.current.search,
            pendingInviteCode,
          ),
          { replace: true },
        );
      }
      completeCreateIntent(data.session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (
        event === "SIGNED_IN" &&
        nextSession &&
        window.sessionStorage.getItem(passkeyOfferStorageKey) === "1"
      ) {
        window.sessionStorage.removeItem(passkeyOfferStorageKey);
        const isRegisteredOnDevice =
          window.localStorage.getItem(
            passkeyRegisteredStorageKey(nextSession.user.id),
          ) === "1";
        setPasskeyPromptOpen(shouldOfferPasskey(isRegisteredOnDevice));
      }
      if (event === "SIGNED_OUT") {
        setPasskeyPromptOpen(false);
      }
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update-password");
        setAuthNotice("");
        navigate("/", { replace: true });
      } else if (
        nextSession &&
        locationRef.current.pathname === "/" &&
        !createIntent
      ) {
        navigate(
          getAuthenticatedDestination(
            locationRef.current.search,
            pendingInviteCode,
          ),
          { replace: true },
        );
      }
      completeCreateIntent(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function signInWithGoogle() {
    if (!supabase) {
      setAuthNoticeKind("error");
      setAuthNotice(
        "Le service de compte n’est pas configuré pour cette application.",
      );
      return;
    }

    const currentLocation = locationRef.current;
    const redirect = new URL(currentLocation.pathname, window.location.origin);
    if (pendingInviteCode) {
      redirect.searchParams.set("invite", pendingInviteCode);
    } else if (pendingCreateOrganization) {
      redirect.searchParams.set("create-organization", "1");
    }
    const authorizationId = new URLSearchParams(currentLocation.search).get(
      "authorization_id",
    );
    if (currentLocation.pathname === "/oauth/consent" && authorizationId) {
      redirect.searchParams.set("authorization_id", authorizationId);
    }

    setAuthSubmitting(true);
    setAuthNotice("");
    storePendingInviteCode(pendingInviteCode);
    window.sessionStorage.setItem(passkeyOfferStorageKey, "1");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect.toString() },
      });
      if (error) throw error;
    } catch (error) {
      window.sessionStorage.removeItem(passkeyOfferStorageKey);
      setAuthNoticeKind("error");
      setAuthNotice(
        authErrorMessage(error instanceof Error ? error.message : ""),
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signInWithPasskey() {
    if (!supabase) {
      setAuthNoticeKind("error");
      setAuthNotice(
        "Le service de compte n’est pas configuré pour cette application.",
      );
      return;
    }

    setAuthSubmitting(true);
    setAuthNotice("");
    storePendingInviteCode(pendingInviteCode);
    try {
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error) throw error;
      setSession(data.session);
      setAuthMode(null);
      if (locationRef.current.pathname !== "/oauth/consent") {
        navigate(
          getAuthenticatedDestination(
            locationRef.current.search,
            pendingInviteCode,
          ),
          { replace: true },
        );
      }
    } catch (error) {
      setAuthNoticeKind("error");
      setAuthNotice(
        authErrorMessage(error instanceof Error ? error.message : ""),
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function registerPasskey() {
    if (!supabase || !session) return;

    setPasskeySubmitting(true);
    setPasskeyNotice("");
    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;
      window.localStorage.setItem(
        passkeyRegisteredStorageKey(session.user.id),
        "1",
      );
      setPasskeyPromptOpen(false);
      setPasskeyNotice(
        "Passkey ajoutée à votre compte et conservée par le gestionnaire de passkeys de votre appareil.",
      );
    } catch (error) {
      setPasskeyNotice(
        authErrorMessage(error instanceof Error ? error.message : ""),
      );
    } finally {
      setPasskeySubmitting(false);
    }
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setAuthNotice(
        "Le service de compte n’est pas configuré pour cette application.",
      );
      return;
    }

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const username = String(formData.get("username") ?? "").trim();
    const passwordConfirmation = String(
      formData.get("password_confirmation") ?? "",
    );
    if (authMode === "signup" && password !== passwordConfirmation) {
      setAuthNoticeKind("error");
      setAuthNotice("Les mots de passe ne correspondent pas.");
      return;
    }

    const currentLocation = locationRef.current;
    const redirect = new URL(currentLocation.pathname, window.location.origin);
    if (pendingInviteCode) {
      redirect.searchParams.set("invite", pendingInviteCode);
    } else if (pendingCreateOrganization) {
      redirect.searchParams.set("create-organization", "1");
    }
    const authorizationId = new URLSearchParams(currentLocation.search).get(
      "authorization_id",
    );
    if (currentLocation.pathname === "/oauth/consent" && authorizationId) {
      redirect.searchParams.set("authorization_id", authorizationId);
    }

    setAuthSubmitting(true);
    setAuthNotice("");
    storePendingInviteCode(pendingInviteCode);
    try {
      if (authMode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirect.toString(),
        });
        if (error) throw error;
        setAuthNoticeKind("success");
        setAuthNotice(
          "Si un compte correspond à cette adresse, un e-mail de réinitialisation vient d’être envoyé.",
        );
        setAuthMode("login");
        return;
      }

      if (authMode === "resend-confirmation") {
        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: redirect.toString() },
        });
        if (error) throw error;
        setAuthNoticeKind("success");
        setAuthNotice(
          "Si cette adresse correspond à un compte en attente de confirmation, un nouveau lien vient d’être envoyé.",
        );
        setAuthMode("login");
        return;
      }

      if (authMode === "update-password") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setAuthMode(null);
        setAuthNoticeKind("success");
        setAuthNotice("");
        if (currentLocation.pathname !== "/oauth/consent") {
          navigate(
            getAuthenticatedDestination(
              currentLocation.search,
              pendingInviteCode,
            ),
            { replace: true },
          );
        }
        return;
      }

      window.sessionStorage.setItem(passkeyOfferStorageKey, "1");
      const result =
        authMode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { username, full_name: username },
                emailRedirectTo: redirect.toString(),
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) throw result.error;
      if (authMode === "signup" && !result.data.session) {
        window.sessionStorage.removeItem(passkeyOfferStorageKey);
        setAuthNoticeKind("success");
        setAuthNotice(
          "Compte créé. Consultez votre boîte e-mail et confirmez votre adresse avant de vous connecter.",
        );
        return;
      }

      setSession(result.data.session);
      setAuthMode(null);
      setAuthNotice("");
      if (currentLocation.pathname !== "/oauth/consent") {
        navigate(
          getAuthenticatedDestination(
            currentLocation.search,
            pendingInviteCode,
          ),
          { replace: true },
        );
      }
      if (pendingCreateOrganization && !handledCreateIntent.current) {
        handledCreateIntent.current = true;
        setPendingCreateOrganization(false);
        setCreateOrganizationIntentReady(true);
      }
    } catch (error) {
      window.sessionStorage.removeItem(passkeyOfferStorageKey);
      setAuthNoticeKind("error");
      setAuthNotice(
        authErrorMessage(error instanceof Error ? error.message : ""),
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function signOut() {
    if (!supabase || !session) return;
    window.sessionStorage.removeItem(passkeyOfferStorageKey);
    await supabase.auth.signOut();
    setSession(null);
    navigate("/", { replace: true });
  }

  return {
    authMode,
    setAuthMode,
    authNotice,
    setAuthNotice,
    authNoticeKind,
    setAuthNoticeKind,
    authSubmitting,
    passkeySubmitting,
    passkeyNotice,
    passkeyPromptOpen,
    setPasskeyPromptOpen,
    rememberSession,
    setRememberSession,
    setAuthSubmitting,
    session,
    setSession,
    authLoading,
    pendingCreateOrganization,
    setPendingCreateOrganization,
    createOrganizationIntentReady,
    setCreateOrganizationIntentReady,
    pendingInviteCode,
    setPendingInviteCode,
    signInWithGoogle,
    signInWithPasskey,
    registerPasskey,
    submitAuth,
    signOut,
  };
}
