import { describe, expect, it } from "vitest";
import {
  formatMatchNotification,
  formatMatchSchedule,
} from "./formatMatchSchedule";

describe("formatMatchSchedule", () => {
  it("formate une date et une heure en français lisible", () => {
    expect(formatMatchSchedule("2026-10-28", "19:30:00")).toBe(
      "mercredi 28 octobre à 19 h 30",
    );
  });

  it("retire le zéro initial d’une heure avant 10 heures", () => {
    expect(formatMatchSchedule("2026-10-28", "09:05")).toBe(
      "mercredi 28 octobre à 9 h 05",
    );
  });

  it("conserve les valeurs reçues si date ou heure sont mal formées", () => {
    expect(formatMatchSchedule("date-invalide", "heure-invalide")).toBe(
      "date-invalide à heure-invalide",
    );
  });

  it("inclut le nom du club dans le corps de la notification", () => {
    expect(
      formatMatchNotification(
        "FC Compo",
        "2026-10-28",
        "19:30",
        "Stade municipal",
      ),
    ).toBe("FC Compo · mercredi 28 octobre à 19 h 30 · Stade municipal");
  });
});
