import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation, useNavigate } from "react-router-dom";
import { authErrorMessage } from "../../lib/authErrorMessage/authErrorMessage";
import {
  initialAuthCallbackMessage,
  supabase,
} from "../../lib/supabase/supabase";
import type { AuthMode } from "../../types";

export function useAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  const handledCreateIntent = useRef(false);

  locationRef.current = location;

  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    const query = new URLSearchParams(window.location.search);
    if (initialAuthCallbackMessage) return "login";
    if (query.has("create-organization")) return "signup";
    return "login";
  });
  const [authNotice, setAuthNotice] = useState(
    () =>
      initialAuthCallbackMessage ||
      (new URLSearchParams(window.location.search).has("invite")
        ? "Connectez-vous ou créez un compte pour rejoindre l’organisation."
        : window.location.pathname === "/oauth/consent" &&
            new URLSearchParams(window.location.search).has("authorization_id")
          ? "Connectez-vous pour examiner cette demande d’autorisation."
          : ""),
  );
  const [authNoticeKind, setAuthNoticeKind] = useState<"error" | "success">(
    initialAuthCallbackMessage ? "error" : "success",
  );
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [pendingCreateOrganization, setPendingCreateOrganization] = useState(
    () =>
      new URLSearchParams(window.location.search).has("create-organization"),
  );
  const [createOrganizationIntentReady, setCreateOrganizationIntentReady] =
    useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(
    () =>
      new URLSearchParams(window.location.search).get("invite")?.trim() ?? "",
  );

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
      navigate("/app/matches", { replace: true });
    };

    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      if (
        data.session &&
        locationRef.current.pathname === "/" &&
        !createIntent
      ) {
        navigate("/app/matches", { replace: true });
      }
      completeCreateIntent(data.session);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("update-password");
        setAuthNotice("");
        navigate("/", { replace: true });
      } else if (
        nextSession &&
        locationRef.current.pathname === "/" &&
        !createIntent
      ) {
        navigate("/app/matches", { replace: true });
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
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect.toString() },
      });
      if (error) throw error;
    } catch (error) {
      setAuthNoticeKind("error");
      setAuthNotice(
        authErrorMessage(error instanceof Error ? error.message : ""),
      );
    } finally {
      setAuthSubmitting(false);
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
          navigate("/app/matches", { replace: true });
        }
        return;
      }

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
        navigate("/app/matches", { replace: true });
      }
      if (pendingCreateOrganization && !handledCreateIntent.current) {
        handledCreateIntent.current = true;
        setPendingCreateOrganization(false);
        setCreateOrganizationIntentReady(true);
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

  async function signOut() {
    if (!supabase || !session) return;
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
    submitAuth,
    signOut,
  };
}
