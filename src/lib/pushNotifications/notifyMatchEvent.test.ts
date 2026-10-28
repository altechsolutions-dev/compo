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

  it("signale les échecs partiels renvoyés par la fonction push", async () => {
    invoke.mockResolvedValueOnce({
      data: { sent: 2, failed: 1 },
      error: null,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await notifyMatchEvent("match_finished", "match-1");

    expect(warn).toHaveBeenCalledWith(
      "Notifications push partiellement envoyées :",
      { sent: 2, failed: 1 },
    );
    warn.mockRestore();
  });
});
