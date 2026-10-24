import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderLiveMatchComposition } from "./renderLiveMatchComposition";

describe("renderLiveMatchComposition", () => {
  it("affiche les équipes et les noms des joueurs", () => {
    render(
      renderLiveMatchComposition({
        teams: [["alex", "unknown"], ["sarah"]],
        playerNames: { alex: "Alex Martin", sarah: "Sarah Benali" },
        onClose: vi.fn(),
      }),
    );

    expect(
      within(screen.getByRole("region", { name: "Équipe rouge" })).getByText(
        "Alex Martin",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Équipe rouge" })).getByText(
        "Joueur",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Équipe bleue" })).getByText(
        "Sarah Benali",
      ),
    ).toBeInTheDocument();
  });

  it("notifie la fermeture depuis le bouton dédié", () => {
    const onClose = vi.fn();

    render(
      renderLiveMatchComposition({
        teams: [[], []],
        playerNames: {},
        onClose,
      }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer la composition" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});
