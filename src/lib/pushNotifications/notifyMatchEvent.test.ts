import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("../supabase/supabase", () => ({
  supabase: { functions: { invoke } },
}));

import { notifyMatchEvent } from "./notifyMatchEvent";

describe("notifyMatchEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transmet l’identifiant du message pour une notification de discussion", async () => {
    invoke.mockResolvedValueOnce({ data: { sent: 1 }, error: null });

    await notifyMatchEvent("chat_message", "match-1", undefined, "message-1");

    expect(invoke).toHaveBeenCalledWith("send-match-push", {
      body: {
        event: "chat_message",
        match_id: "match-1",
        chat_message_id: "message-1",
      },
    });
  });

  it("transmet l’événement de confirmation d’un match complet", async () => {
    invoke.mockResolvedValueOnce({ data: { sent: 1 }, error: null });

    await notifyMatchEvent("match_confirmed", "match-1");

    expect(invoke).toHaveBeenCalledWith("send-match-push", {
      body: { event: "match_confirmed", match_id: "match-1" },
    });
  });

  it("retente les abonnements en échec pour une confirmation", async () => {
    invoke
      .mockResolvedValueOnce({ data: { sent: 1, failed: 1 }, error: null })
      .mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });

    await notifyMatchEvent("match_confirmed", "match-1");

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(2, "send-match-push", {
      body: {
        event: "match_confirmed",
        match_id: "match-1",
      },
    });
  });

  it("retente les abonnements en échec pour une discussion", async () => {
    invoke
      .mockResolvedValueOnce({ data: { sent: 1, failed: 1 }, error: null })
      .mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });

    await notifyMatchEvent("chat_message", "match-1", undefined, "message-1");

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenNthCalledWith(2, "send-match-push", {
      body: {
        event: "chat_message",
        match_id: "match-1",
        chat_message_id: "message-1",
      },
    });
  });

  it("retente les abonnements en échec pour un match terminé", async () => {
    invoke
      .mockResolvedValueOnce({ data: { sent: 2, failed: 1 }, error: null })
      .mockResolvedValueOnce({ data: { sent: 1, failed: 0 }, error: null });

    await notifyMatchEvent("match_finished", "match-1");

    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
