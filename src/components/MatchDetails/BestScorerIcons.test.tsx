import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BestScorerIcons } from "./BestScorerIcons";

describe("BestScorerIcons", () => {
  const teams: [string[], string[]] = [["red", "red-2"], ["blue"]];

  it.each([
    { scorers: ["red"], colors: ["text-(--team-a-red)"] },
    { scorers: ["blue"], colors: ["text-(--team-b-blue)"] },
    { scorers: ["red", "red-2"], colors: ["text-(--team-a-red)"] },
    {
      scorers: ["red", "blue"],
      colors: ["text-(--team-b-blue)", "text-(--team-a-red)"],
    },
    { scorers: [], colors: ["text-(--text-secondary)"] },
    { scorers: ["unknown"], colors: ["text-(--text-secondary)"] },
  ])("affiche les couleurs correspondant aux buteurs $scorers", ({ scorers, colors }) => {
    const { container } = render(
      <BestScorerIcons scorerIds={scorers} teams={teams} />,
    );
    const icons = Array.from(container.querySelectorAll("svg"));
    expect(icons).toHaveLength(colors.length);
    icons.forEach((icon, index) => {
      expect(icon.parentElement).toHaveClass(colors[index]);
    });
  });
});
