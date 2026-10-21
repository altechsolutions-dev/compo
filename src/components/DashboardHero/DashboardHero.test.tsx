import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardHero } from "./DashboardHero";

describe("DashboardHero", () => {
  it("affiche le hero des matchs et transmet la création", () => {
    const onCreateMatch = vi.fn();
    render(
      <DashboardHero
        organization="Les Panthères"
        matchCount={2}
        activeView="matches"
        onCreateMatch={onCreateMatch}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ton équipe. Ton terrain." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("LES PANTHÈRES · 2 MATCHS AU PROGRAMME"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Créer un match" }));
    expect(onCreateMatch).toHaveBeenCalledOnce();
  });

  it("masque l’action de création dans l’onglet organisation", () => {
    render(
      <DashboardHero
        organization="Les Panthères"
        matchCount={0}
        activeView="organization"
        onCreateMatch={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Ton équipe. Ton collectif." }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Créer un match" }),
    ).not.toBeInTheDocument();
  });
});
