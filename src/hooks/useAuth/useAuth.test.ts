import { describe, expect, it } from "vitest";
import { shouldOfferPasskey } from "./useAuth";

describe("shouldOfferPasskey", () => {
  it("proposes une passkey uniquement si le compte n’en a aucune", () => {
    expect(shouldOfferPasskey([])).toBe(true);
    expect(shouldOfferPasskey([{ id: "registered-passkey" }])).toBe(false);
  });
});
