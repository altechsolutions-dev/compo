import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardDialog } from "./DashboardDialog";

describe("DashboardDialog", () => {
  it("affiche le titre, le contenu et ferme avec son bouton", () => {
    const onClose = vi.fn();
    render(
      <DashboardDialog kind="match" onClose={onClose}>
        <p>Formulaire de match</p>
      </DashboardDialog>,
    );

    expect(
      screen.getByRole("dialog", { name: "Nouveau créneau" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Formulaire de match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ferme au clic sur le backdrop, pas sur le contenu", () => {
    const onClose = vi.fn();
    render(
      <DashboardDialog kind="code" onClose={onClose}>
        <p>Formulaire de code</p>
      </DashboardDialog>,
    );
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
