import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LiveMatchMockPage } from "./LiveMatchMockPage";

describe("LiveMatchMockPage", () => {
  it("affiche la page complète et lance le match de démonstration", () => {
    render(
      <MemoryRouter initialEntries={["/mock/match-en-direct"]}>
        <LiveMatchMockPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "En direct" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("heading", { name: "Five du dimanche" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Lancer le match" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Lancer le match" }));

    expect(screen.getByText("EN JEU")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "But !" })).toBeEnabled();
    expect(
      screen.queryByRole("group", { name: "Choisir le buteur" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    expect(screen.getByText("EN PAUSE")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    fireEvent.click(screen.getByRole("button", { name: "Alex Martin" }));
    expect(
      within(screen.getByRole("region", { name: "Score du match" })).getByText(
        "1",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(screen.getByText("EN JEU")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siffler la fin" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la fin" }));
    expect(screen.getByText("MATCH TERMINÉ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "But !" })).toBeDisabled();
  });
});
