import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushNotificationsControl } from "./PushNotificationsControl";

const { supabaseFrom, supabaseUpsert, useAuthContext } = vi.hoisted(() => ({
  supabaseFrom: vi.fn(),
  supabaseUpsert: vi.fn(),
  useAuthContext: vi.fn(),
}));

vi.mock("../../hooks/useAuth/AuthContext", () => ({ useAuthContext }));
vi.mock("../../lib/supabase/supabase", () => ({
  supabase: { from: supabaseFrom },
}));

describe("PushNotificationsControl", () => {
  const pushSubscription = {
    endpoint: "https://push.example.test/subscription-1",
    toJSON: () => ({ keys: { p256dh: "public-key", auth: "auth-key" } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  } as unknown as PushSubscription;

  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockResolvedValue(pushSubscription),
  };

  const registration = {
    active: { state: "activated", scriptURL: "/dev-sw.js?dev-sw" },
    installing: null,
    waiting: null,
    pushManager,
  } as unknown as ServiceWorkerRegistration;

  const register = vi.fn().mockResolvedValue(registration);
  const getRegistration = vi.fn().mockResolvedValue(registration);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VITE_WEB_PUSH_PUBLIC_KEY", "A".repeat(87));
    useAuthContext.mockReturnValue({ session: { user: { id: "user-1" } } });
    supabaseFrom.mockReturnValue({ upsert: supabaseUpsert });
    supabaseUpsert.mockResolvedValue({ error: null });
    pushManager.getSubscription.mockResolvedValue(null);
    pushManager.subscribe.mockResolvedValue(pushSubscription);
    getRegistration.mockResolvedValue(registration);
    register.mockResolvedValue(registration);

    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class PushManager {},
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        requestPermission: vi.fn().mockResolvedValue("granted"),
      },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        getRegistration,
        register,
      },
    });
  });

  it("crée l’abonnement navigateur et l’enregistre dans Supabase", async () => {
    render(<PushNotificationsControl />);

    fireEvent.click(
      screen.getByRole("button", { name: "Activer les notifications" }),
    );

    await waitFor(() =>
      expect(
        screen.getByText("Cet appareil recevra les alertes de match."),
      ).toBeInTheDocument(),
    );
    expect(pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
    expect(supabaseFrom).toHaveBeenCalledWith("push_subscriptions");
    expect(supabaseUpsert).toHaveBeenCalledWith(
      {
        user_id: "user-1",
        endpoint: pushSubscription.endpoint,
        p256dh: "public-key",
        auth: "auth-key",
      },
      { onConflict: "endpoint" },
    );
    expect(screen.getByRole("button", { name: "Désactiver" })).toBeEnabled();
  });

  it("affiche l’erreur MIME de l’enregistrement du worker sans rester bloqué", async () => {
    getRegistration.mockResolvedValue(null);
    register.mockRejectedValue(
      new Error(
        "Failed to register a ServiceWorker: The script has an unsupported MIME type ('text/html').",
      ),
    );
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        getRegistration,
        register,
      },
    });
    render(<PushNotificationsControl />);

    fireEvent.click(
      screen.getByRole("button", { name: "Activer les notifications" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "unsupported MIME type ('text/html')",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Activer les notifications" }),
      ).toBeEnabled(),
    );
    expect(register).toHaveBeenCalledWith("/dev-sw.js?dev-sw");
  });
});
