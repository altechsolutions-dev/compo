import { describe, expect, it } from "vitest";
import { formatMatchDate } from "./formatMatchDate";

describe("formatMatchDate", () => {
  it("formate une date de match en français sans décalage de fuseau horaire", () => {
    expect(formatMatchDate("2026-10-23")).toBe("vendredi 23 octobre");
  });
});
