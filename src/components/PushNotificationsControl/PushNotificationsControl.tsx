import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { useAuthContext } from "../../hooks/useAuth/AuthContext";
import { supabase } from "../../lib/supabase/supabase";

function waitWithTimeout<T>(
  promise: PromiseLike<T>,
  message: string,
  timeoutMs = 15_000,
): Promise<T> {
  let timeoutId: number;
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(
        () => reject(new Error(message)),
        timeoutMs,
      );
    }),
  ]).finally(() => window.clearTimeout(timeoutId));
}

function decodeVapidKey(value: string) {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationsControl() {
  const { session } = useAuthContext();
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [notice, setNotice] = useState("");
  const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  useEffect(() => {
    if (!supported) return;
    let active = true;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((current) => {
        if (active) setSubscription(current);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [supported]);

  async function getPushRegistration() {
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      setPhase("Enregistrement du service worker…");
      const serviceWorkerUrl = import.meta.env.DEV
        ? "/dev-sw.js?dev-sw"
        : "/sw.js";
      registration = await waitWithTimeout(
        navigator.serviceWorker.register(serviceWorkerUrl),
        `Impossible d’enregistrer ${serviceWorkerUrl}. Vérifiez la réponse du service worker dans l’onglet Réseau.`,
      );
    }

    try {
      return await waitWithTimeout(
        navigator.serviceWorker.ready,
        "Le service worker est inscrit mais ne s’active pas. Rechargez la page et vérifiez les erreurs de /sw.js dans la console du navigateur.",
      );
    } catch {
      const worker =
        registration.installing ?? registration.waiting ?? registration.active;
      const state = worker?.state ?? "aucun worker";
      throw new Error(
        `État du service worker : ${state} (${worker?.scriptURL ?? "/sw.js"}). Vérifiez le script du worker dans l’onglet Réseau et rechargez la page.`,
      );
    }
  }

  async function toggleSubscription() {
    if (!supabase || !session || !supported || !vapidPublicKey) return;
    setBusy(true);
    setPhase("Préparation du service worker…");
    setNotice("");
    try {
      const registration = await getPushRegistration();
      if (subscription) {
        setPhase("Désactivation sur cet appareil…");
        await waitWithTimeout(
          subscription.unsubscribe(),
          "Le navigateur n’a pas confirmé la désactivation.",
        );
        setSubscription(null);
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);
        if (error) throw error;
        setNotice("Notifications désactivées sur cet appareil.");
      } else {
        setPhase("Autorisez les notifications dans la fenêtre du navigateur…");
        const permission = await waitWithTimeout(
          Notification.requestPermission(),
          "La demande d’autorisation a expiré. Vérifiez la fenêtre ou les réglages de notifications du navigateur.",
          60_000,
        );
        if (permission !== "granted") {
          setNotice(
            "Autorisez les notifications dans les réglages du navigateur.",
          );
          return;
        }
        setPhase("Création de l’abonnement push…");
        const created = await waitWithTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeVapidKey(vapidPublicKey),
          }),
          "Le navigateur n’a pas pu créer l’abonnement push. Vérifiez que le site est en HTTPS et réessayez.",
        );
        const keys = created.toJSON().keys;
        if (!keys?.p256dh || !keys.auth) {
          await created.unsubscribe();
          throw new Error(
            "Le navigateur n’a pas fourni les clés de souscription.",
          );
        }
        setPhase("Enregistrement dans Supabase…");
        const { error } = await waitWithTimeout(
          supabase.from("push_subscriptions").upsert(
            {
              user_id: session.user.id,
              endpoint: created.endpoint,
              p256dh: keys.p256dh,
              auth: keys.auth,
            },
            { onConflict: "endpoint" },
          ),
          "Supabase ne répond pas. Vérifiez la connexion et la migration des notifications.",
        );
        if (error) {
          await created.unsubscribe();
          throw error;
        }
        setSubscription(created);
        setNotice("Cet appareil recevra les alertes de match.");
      }
    } catch (error) {
      setNotice(
        `Impossible de modifier l’abonnement : ${error instanceof Error ? error.message : "erreur inconnue"}`,
      );
    } finally {
      setBusy(false);
      setPhase("");
    }
  }

  if (!supported) return null;

  return (
    <section className="flex flex-col gap-2 border-b border-(--line) py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="m-0 text-sm font-bold text-(--text-primary)">
          Alertes de match
        </h2>
        <p className="mb-0 mt-1 text-xs text-(--text-secondary)" role="status">
          {!session
            ? "Connectez-vous pour recevoir les notifications sur vos appareils."
            : !vapidPublicKey
              ? "La configuration Web Push du serveur est requise."
              : notice ||
                phase ||
                (subscription
                  ? "Notifications activées sur cet appareil."
                  : "Recevez les nouveaux matchs et les changements importants.")}
        </p>
      </div>
      <button
        aria-pressed={Boolean(subscription)}
        className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[3px] border border-(--line) bg-transparent px-3 text-xs font-semibold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!session || !vapidPublicKey || busy}
        onClick={() => void toggleSubscription()}
        type="button"
      >
        {subscription ? <BellOff size={15} /> : <Bell size={15} />}
        {busy
          ? phase.startsWith("Autorisez")
            ? "Autorisation requise…"
            : "Mise à jour…"
          : subscription
            ? "Désactiver"
            : "Activer les notifications"}
      </button>
    </section>
  );
}
