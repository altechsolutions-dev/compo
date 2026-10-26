import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateMatchDialogContainer } from "./CreateMatchDialogContainer";

function renderContainer() {
  const callbacks = {
    onClose: vi.fn(),
    onDateChange: vi.fn(),
    onTimeChange: vi.fn(),
    onVenueChange: vi.fn(),
    onMaxPlayersChange: vi.fn(),
    onJoinOnCreateChange: vi.fn(),
    onSubmit: vi.fn((event) => event.preventDefault()),
  };
  render(
    <CreateMatchDialogContainer
      organizationName="Les Panthères"
      date="2026-10-23"
      minDate="2026-10-20"
      time="19:30"
      venue="Urban Soccer"
      maxPlayers={10}
      joinOnCreate
      saving={false}
      {...callbacks}
    />,
  );
  return callbacks;
}

describe("CreateMatchDialogContainer", () => {
  it("assemble la modale et transmet les changements de formulaire", () => {
    const callbacks = renderContainer();

    expect(
      screen.getByRole("dialog", { name: "Nouveau créneau" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Les Panthères")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nouveau créneau" })).toHaveClass(
      "dashboard-dialog__panel--match",
    );
    expect(screen.getByLabelText("Date du match")).toHaveValue("2026-10-23");
    fireEvent.change(screen.getByLabelText("Terrain"), {
      target: { value: "Five Paris" },
    });
    fireEvent.change(screen.getByLabelText("Nombre de places"), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByLabelText("M’inscrire à ce match"));

    const submitButton = screen.getByRole("button", {
      name: "Créer le créneau",
    });
    expect(submitButton).toHaveClass(
      "create-match-dialog-form__submit",
      "bg-(--team-b-blue)",
    );
    expect(submitButton.parentElement?.lastElementChild).toBe(submitButton);
    expect(callbacks.onVenueChange).toHaveBeenCalledWith("Five Paris");
    expect(callbacks.onMaxPlayersChange).toHaveBeenCalledWith(12);
    expect(callbacks.onJoinOnCreateChange).toHaveBeenCalledWith(false);
  });

  it("transmet la soumission et désactive l’action pendant l’enregistrement", () => {
    const callbacks = renderContainer();
    fireEvent.submit(
      screen.getByRole("button", { name: "Créer le créneau" }).closest("form")!,
    );
    expect(callbacks.onSubmit).toHaveBeenCalledOnce();

    render(
      <CreateMatchDialogContainer
        organizationName="Les Panthères"
        date="2026-10-23"
        minDate="2026-10-20"
        time="19:30"
        venue="Urban Soccer"
        maxPlayers={10}
        joinOnCreate={false}
        saving
        {...callbacks}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Enregistrement…" }),
    ).toBeDisabled();
  });

  it("affiche le formulaire de modification sans l’option d’inscription", () => {
    const callbacks = {
      onClose: vi.fn(),
      onDateChange: vi.fn(),
      onTimeChange: vi.fn(),
      onVenueChange: vi.fn(),
      onMaxPlayersChange: vi.fn(),
      onJoinOnCreateChange: vi.fn(),
      onSubmit: vi.fn((event) => event.preventDefault()),
    };
    render(
      <CreateMatchDialogContainer
        organizationName="Les Panthères"
        date="2026-10-23"
        minDate="2026-10-20"
        minTime="18:45"
        time="19:30"
        venue="Urban Soccer"
        maxPlayers={10}
        joinOnCreate={false}
        saving={false}
        editing
        {...callbacks}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Modifier le créneau" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enregistrer les modifications" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date du match")).toHaveAttribute(
      "min",
      "2026-10-20",
    );
    expect(screen.getByLabelText("Heure")).toHaveAttribute("min", "18:45");
    expect(screen.queryByLabelText("M’inscrire à ce match")).toBeNull();
  });
});
