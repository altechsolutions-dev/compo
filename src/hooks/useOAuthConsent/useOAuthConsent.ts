import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { authErrorMessage } from "../../lib/authErrorMessage/authErrorMessage";
import { supabase } from "../../lib/supabase/supabase";
import type { OAuthConsentDetails } from "../../types";

type UseOAuthConsentOptions = {
  authorizationId: string | null;
  enabled: boolean;
  authLoading: boolean;
  session: Session | null;
};

export function useOAuthConsent({
  authorizationId,
  enabled,
  authLoading,
  session,
}: UseOAuthConsentOptions) {
  const [consent, setConsent] = useState<OAuthConsentDetails | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!enabled || !authorizationId || authLoading || !supabase || !session) {
      setConsent(null);
      setError("");
      return;
    }

    let cancelled = false;
    void supabase.auth.oauth
      .getAuthorizationDetails(authorizationId)
      .then(({ data, error: requestError }) => {
        if (cancelled) return;
        if (requestError) {
          setError(authErrorMessage(requestError.message));
          return;
        }
        if (!data) {
          setError("La demande d’autorisation est introuvable.");
          return;
        }
        if ("redirect_url" in data) {
          window.location.replace(data.redirect_url);
          return;
        }
        setConsent(data as OAuthConsentDetails);
      })
      .catch((requestError: unknown) => {
        if (cancelled) return;
        setError(
          authErrorMessage(
            requestError instanceof Error ? requestError.message : "",
          ),
        );
      });

    return () => {
      cancelled = true;
    };
  }, [authorizationId, authLoading, enabled, session]);

  async function decide(approved: boolean) {
    if (!supabase || !authorizationId) return;
    setSubmitting(true);
    setError("");
    try {
      const { error: decisionError } = approved
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (decisionError) throw decisionError;
    } catch (decisionError) {
      setError(
        authErrorMessage(
          decisionError instanceof Error ? decisionError.message : "",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const loading = Boolean(
    enabled && authorizationId && supabase && session && !consent && !error,
  );
  const routeError = !authorizationId
    ? "Aucune demande OAuth n’est en cours. Ouvre cette page depuis l’application qui demande l’accès."
    : !supabase
      ? "Le service de compte n’est pas configuré pour cette application."
      : "";

  return {
    consent,
    error,
    submitting,
    loading,
    routeError,
    requestedScopes: consent?.scope.split(" ").filter(Boolean) ?? [],
    decide,
  };
}
