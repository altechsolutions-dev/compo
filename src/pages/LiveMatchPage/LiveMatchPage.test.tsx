import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { MatchSlot } from "../../types";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";
import { LiveMatchPage } from "./LiveMatchPage";

const liveMatch: MatchSlot = {
  id: "match-live",
  date: "2030-06-15",
  time: "19:30",
  venue: "Five du dimanche · Terrain 3",
  maxPlayers: 2,
  attendees: ["lucas", "theo"],
  status: "in_progress",
  startedAt: "2030-06-15T19:30:00.000Z",
  teams: [["lucas"], ["theo"]],
  goals: [
    {
      id: "goal-1",
      scorerId: "lucas",
      team: 0,
      elapsedSeconds: 84,
      createdAt: "2030-06-15T19:31:24.000Z",
    },
  ],
};

function renderLivePage(match: MatchSlot = liveMatch) {
  const context = {
    allMatches: [match],
    isLoadingOrganizations: false,
    organization: "Les Panthères",
    organizationId: "org-1",
    onJoinWithCode: vi.fn(),
    composeTeams: vi.fn(() => [["lucas"], ["theo"]]),
    playerNames: { lucas: "Lucas Martin", theo: "Théo Bernard" },
    matchNotice: "",
    onRecordGoal: vi.fn(),
    onStartMatch: vi.fn(),
    onSetMatchState: vi.fn(),
    onSwapPlayers: vi.fn(),
  } as unknown as WorkspaceRouteContext;
  render(
    <MemoryRouter initialEntries={["/app/live?match=match-live"]}>
      <Routes>
        <Route path="/app" element={<Outlet context={context} />}>
          <Route path="live" element={<LiveMatchPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return { context };
}

describe("LiveMatchPage", () => {
  it("affiche le chrono, le score et l’historique du match sélectionné", () => {
    renderLivePage();

    expect(
      screen.getByRole("heading", { name: "Five du samedi" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("timer", { name: "Temps de jeu" }),
    ).toBeInTheDocument();
    const scoreRegion = screen.getByRole("region", { name: "Score du match" });
    const scorePanels = scoreRegion.querySelectorAll(":scope > div");
    expect(scorePanels[0]).toHaveTextContent("ÉQUIPE BLEUE");
    expect(scorePanels[2]).toHaveTextContent("ÉQUIPE ROUGE");
    expect(
      within(scoreRegion).queryByText("Lucas Martin"),
    ).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "Événements du match" }),
      ).getByText("Lucas Martin"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "But !" })).toBeEnabled();
    expect(
      screen.queryByRole("group", { name: "Choisir le buteur" }),
    ).not.toBeInTheDocument();
  });

  it("ne montre pas un match terminé dans l’onglet En direct, même demandé par son identifiant", () => {
    renderLivePage({
      ...liveMatch,
      status: "finished",
      startedAt: undefined,
      elapsedSeconds: 3600,
    });

    expect(
      screen.getByRole("heading", { name: "Pas de match à l’écran" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Résumé du match" }),
    ).not.toBeInTheDocument();
  });

  it("affiche la composition uniquement à la demande avant le coup d’envoi", async () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
    };
    renderLivePage(scheduledMatch);

    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
    const openComposition = screen.getByRole("button", {
      name: "Voir la compo",
    });
    const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
    fireEvent.click(openComposition);
    const composition = await screen.findByRole("dialog", {
      name: "Composition du match",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fermer la composition" }),
      ).toHaveFocus(),
    );
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    focusSpy.mockRestore();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.getElementById("match-composition-drawer")).toHaveClass(
      "match-drawer-panel",
      "is-open",
    );
    expect(within(composition).getByText("Lucas Martin")).toBeInTheDocument();
    expect(within(composition).getByText("Théo Bernard")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer la composition" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
    expect(openComposition).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.getElementById("match-composition-drawer")).not.toHaveClass(
      "is-open",
    );
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(document.getElementById("match-composition-drawer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    await screen.findByRole("dialog", { name: "Composition du match" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
  });

  it("permet de valider un but et d’échanger deux joueurs d’équipes opposées", async () => {
    const { context } = renderLivePage();

    const openGoalPicker = screen.getByRole("button", { name: "But !" });
    fireEvent.click(openGoalPicker);
    const goalDialog = await screen.findByRole("dialog", {
      name: "Qui a marqué ?",
    });
    expect(goalDialog).toBeInTheDocument();
    expect(
      within(goalDialog)
        .getAllByRole("region")
        .map((teamRegion) => teamRegion.getAttribute("aria-label")),
    ).toEqual(["Équipe bleue", "Équipe rouge"]);
    const cancelGoal = screen.getByRole("button", {
      name: "Annuler la saisie du but",
    });
    await waitFor(() => expect(cancelGoal).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    screen.getByRole("button", { name: "Lucas Martin" }).focus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Lucas Martin" }), {
      key: "Tab",
    });
    expect(cancelGoal).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Qui a marqué ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(openGoalPicker).toHaveFocus();
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    await screen.findByRole("dialog", { name: "Qui a marqué ?" });
    fireEvent.click(screen.getByRole("button", { name: "Théo Bernard" }));
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Qui a marqué ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(document.body.style.overflow).toBe(""));

    const openSwapPicker = screen.getByRole("button", {
      name: "Échanger deux joueurs",
    });
    fireEvent.click(openSwapPicker);
    const swapDialog = await screen.findByRole("dialog", {
      name: "Quels joueurs échanger ?",
    });
    const cancelSwap = screen.getByRole("button", {
      name: "Annuler l’échange des joueurs",
    });
    await waitFor(() => expect(cancelSwap).toHaveFocus());
    expect(document.body.style.overflow).toBe("hidden");
    const confirmSwap = within(swapDialog).getByRole("button", {
      name: "Échanger les joueurs",
    });
    expect(confirmSwap).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe rouge"), {
      target: { value: "lucas" },
    });
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe bleue"), {
      target: { value: "theo" },
    });
    expect(confirmSwap).toBeEnabled();
    fireEvent.click(confirmSwap);
    expect(context.onSwapPlayers).toHaveBeenCalledWith(
      "match-live",
      "lucas",
      "theo",
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Quels joueurs échanger ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(openSwapPicker).toHaveFocus();
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(document.body.style.overflow).toBe("");

    fireEvent.click(openSwapPicker);
    await screen.findByRole("dialog", { name: "Quels joueurs échanger ?" });
    expect(
      screen.getByRole("dialog", { name: "Quels joueurs échanger ?" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Quels joueurs échanger ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(openSwapPicker).toHaveFocus();
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
  });

  it("propose la pause et la fin pendant le match", async () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    const openFinishDialog = screen.getByRole("button", {
      name: "Siffler la fin",
    });
    fireEvent.click(openFinishDialog);
    await screen.findByRole("alertdialog", {
      name: "Siffler la fin du match ?",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Continuer le match" }),
      ).toHaveFocus(),
    );
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("alertdialog", {
          name: "Siffler la fin du match ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(openFinishDialog).toHaveFocus();
    await waitFor(() => expect(document.body.style.overflow).toBe(""));
    expect(document.body.style.overflow).toBe("");
    fireEvent.click(openFinishDialog);
    await screen.findByRole("alertdialog", {
      name: "Siffler la fin du match ?",
    });

    expect(context.onSetMatchState).toHaveBeenCalledWith("match-live", "pause");
    expect(context.onSetMatchState).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la fin" }));
    expect(context.onSetMatchState).toHaveBeenCalledWith(
      "match-live",
      "finish",
    );
  });

  it("garde les actions de saisie disponibles pendant la pause", async () => {
    const pausedMatch: MatchSlot = {
      ...liveMatch,
      status: "paused",
      startedAt: undefined,
      elapsedSeconds: 84,
    };
    const { context } = renderLivePage(pausedMatch);

    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    await screen.findByRole("dialog", { name: "Qui a marqué ?" });
    fireEvent.click(screen.getByRole("button", { name: "Théo Bernard" }));
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");

    fireEvent.click(
      screen.getByRole("button", { name: "Échanger deux joueurs" }),
    );
    await screen.findByRole("dialog", { name: "Quels joueurs échanger ?" });
    expect(
      screen.getByRole("dialog", { name: "Quels joueurs échanger ?" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe rouge"), {
      target: { value: "lucas" },
    });
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe bleue"), {
      target: { value: "theo" },
    });
    expect(
      screen.getByRole("button", { name: "Échanger les joueurs" }),
    ).toBeEnabled();
  });
});
