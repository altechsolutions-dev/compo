import { describe, expect, it } from "vitest";
import { shouldOfferPasskey } from "./useAuth";

describe("shouldOfferPasskey", () => {
  it("propose une passkey si elle n’a pas été enregistrée sur cet appareil", () => {
    expect(shouldOfferPasskey(false)).toBe(true);
    expect(shouldOfferPasskey(true)).toBe(false);
  });
});
