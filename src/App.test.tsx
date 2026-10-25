import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./lib/supabase/supabase", () => ({
  initialAuthCallbackMessage: "",
  supabase: null,
}));

describe("App routes", () => {
  it("redirige les visiteurs non connectés vers la page d’accueil depuis l’espace privé", async () => {
    render(
      <MemoryRouter initialEntries={["/app/organizations"]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("heading", { name: "Connecte-toi" }),
    ).toBeVisible();
  });
});
