import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FullMatchMock } from "./FullMatchMock";

describe("FullMatchMock", () => {
  it("montre un match complet et permet de tester une place libérée puis reprise", () => {
    render(
      <MemoryRouter>
        <FullMatchMock />
      </MemoryRouter>,
    );

    expect(screen.getByText("COMPLET · COMPO DISPONIBLE")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("match-card")).getByRole("progressbar"),
    ).toHaveAttribute("aria-valuenow", "10");
    expect(screen.getByRole("dialog")).toHaveTextContent("MATCH COMPLET");
    expect(screen.getByText("Composition du match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Lancer le match" }));
    expect(screen.getByRole("timer")).toBeInTheDocument();
    expect(screen.getByText("EN DIRECT")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Joueur qui a marqué"), {
      target: { value: "alex" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter un but" }));
    expect(screen.getByText("Alex Martin · Équipe A")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("MATCH EN COURS");

    fireEvent.click(screen.getByRole("button", { name: "Retirer un joueur" }));

    expect(
      within(screen.getByTestId("match-card")).getByRole("progressbar"),
    ).toHaveAttribute("aria-valuenow", "9");
    expect(screen.getByRole("button", { name: "Je m'inscris" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Je m'inscris" }));

    expect(
      within(screen.getByTestId("match-card")).getByRole("progressbar"),
    ).toHaveAttribute("aria-valuenow", "10");
    expect(
      screen.getByRole("button", { name: "Vous êtes inscrit" }),
    ).toBeDisabled();
  });
});
