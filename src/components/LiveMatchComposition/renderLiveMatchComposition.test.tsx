import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiveMatchComposition } from "./renderLiveMatchComposition";

describe("renderLiveMatchComposition", () => {
  it("conserve la hauteur des lignes en mode édition", () => {
    render(
      <LiveMatchComposition
        teams={[["alex"], ["sarah"]]}
        playerNames={{ alex: "Alex Martin", sarah: "Sarah Benali" }}
        onClose={vi.fn()}
        isEditable
        onSaveTeams={vi.fn().mockResolvedValue(true)}
      />,
    );

    const redTeam = screen.getByRole("region", { name: "Équipe rouge" });
    const playerRow = within(redTeam).getByRole("listitem");
    const readOnlyButton = within(playerRow).getByRole("button", {
      name: "Alex Martin",
    });
    expect(readOnlyButton).toHaveClass("min-h-9", "border");
    expect(readOnlyButton).toBeDisabled();
    expect(
      readOnlyButton.querySelector("span[aria-hidden='true']"),
    ).toHaveClass("size-4.5", "invisible");
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier la composition" }),
    );

    expect(playerRow).toHaveClass("m-0");
    const editingButton = within(redTeam).getByRole("button", {
      name: "Sélectionner Alex Martin dans l'équipe rouge",
    });
    expect(editingButton).toHaveClass("min-h-9", "border");
    expect(editingButton.querySelector("span[aria-hidden='true']")).toHaveClass(
      "size-4.5",
      "visible",
    );
  });

  it("affiche les équipes et les noms des joueurs", () => {
    render(
      <LiveMatchComposition
        teams={[["alex", "unknown"], ["sarah"]]}
        playerNames={{ alex: "Alex Martin", sarah: "Sarah Benali" }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen
        .getAllByRole("region")
        .map((region) => region.getAttribute("aria-label")),
    ).toEqual(["Équipe bleue", "Équipe rouge"]);
    expect(screen.getByRole("region", { name: "Équipe bleue" })).toHaveClass(
      "min-w-0",
    );
    expect(
      screen.getByRole("region", { name: "Équipe bleue" }).parentElement,
    ).toHaveClass("gap-3.5", "sm:grid-cols-2");
    expect(
      within(screen.getByRole("region", { name: "Équipe rouge" })).getByText(
        "Alex Martin",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Équipe rouge" })).getByRole(
        "button",
        { name: "Alex Martin" },
      ),
    ).toHaveClass("text-xs", "text-(--team-a-red)", "bg-(--team-a-red)/5");
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
    expect(
      within(screen.getByRole("region", { name: "Équipe bleue" })).getByRole(
        "button",
        { name: "Sarah Benali" },
      ),
    ).toHaveClass("text-(--team-b-blue)", "bg-(--team-b-blue)/5");
  });

  it("notifie la fermeture depuis le bouton dédié", () => {
    const onClose = vi.fn();

    render(
      <LiveMatchComposition
        teams={[[], []]}
        playerNames={{}}
        onClose={onClose}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer la composition" }),
    );

    expect(onClose).toHaveBeenCalledOnce();
  });
});
