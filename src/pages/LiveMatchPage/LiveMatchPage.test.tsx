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

function renderLivePage(
  match: MatchSlot = liveMatch,
  matches: MatchSlot[] = [match],
  matchNotice = "",
) {
  const context = {
    allMatches: matches,
    isLoadingOrganizations: false,
    organization: "Les Panthères",
    organizationId: "org-1",
    onJoinWithCode: vi.fn(),
    composeTeams: vi.fn(() => [["lucas"], ["theo"]]),
    playerNames: { lucas: "Lucas Martin", theo: "Théo Bernard" },
    matchNotice,
    onResetMatch: vi.fn().mockResolvedValue(true),
    onRecordGoal: vi.fn(),
    onRemoveGoal: vi.fn(),
    onStartMatch: vi.fn(),
    onSaveScheduledMatchTeams: vi.fn().mockResolvedValue(true),
    onSetMatchState: vi.fn(),
    onSwapPlayers: vi.fn(),
  } as unknown as WorkspaceRouteContext;
  const view = render(
    <MemoryRouter initialEntries={["/app/live?match=match-live"]}>
      <Routes>
        <Route path="/app" element={<Outlet context={context} />}>
          <Route path="live" element={<LiveMatchPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  return { context, ...view };
}

describe("LiveMatchPage", () => {
  it("allège l’en-tête du match actif et affiche score et historique", () => {
    const { context } = renderLivePage();

    expect(
      screen.queryByRole("heading", { name: "Five du samedi" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("MATCH EN COURS")).not.toBeInTheDocument();
    expect(screen.queryByText("Match affiché")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Five du dimanche · Terrain 3"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("timer", { name: "Temps de jeu" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mettre en pause" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Actions du match" }),
    ).toBeInTheDocument();
    const actionNavigation = screen.getByRole("navigation", {
      name: "Actions du match",
    });
    expect(actionNavigation).toHaveClass(
      "shadow-[0_-12px_32px_#0008]",
      "sm:shadow-none",
    );
    const actionButtons = within(actionNavigation).getAllByRole("button");
    expect(actionButtons[0]).toHaveClass("max-sm:h-14");
    expect(actionButtons[1]).toHaveClass("max-sm:h-14");
    expect(actionButtons[2]).toHaveClass("max-sm:h-14");
    expect(actionButtons[0]).not.toHaveClass("max-sm:border-l");
    expect(actionButtons[1]).toHaveClass(
      "max-sm:border-l",
      "max-sm:border-l-(--line)",
    );
    expect(actionButtons[2]).toHaveClass(
      "max-sm:border-l",
      "max-sm:border-l-(--line)",
    );
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    const scoreRegion = screen.getByRole("region", { name: "Score du match" });
    const scorePanels = scoreRegion.querySelectorAll(":scope > div");
    expect(scorePanels[0]).toHaveClass("px-5", "max-[380px]:px-3");
    expect(scorePanels[2]).toHaveClass("px-5", "max-[380px]:px-3");
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
    expect(
      screen.getByRole("button", { name: "Supprimer le but de Lucas Martin" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "But !" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ajouter un but pour Lucas Martin" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    ).toHaveAttribute("title", expect.stringContaining("s"));
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer le but de Lucas Martin" }),
    );
    expect(context.onRemoveGoal).toHaveBeenCalledWith("match-live", "goal-1");
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter un but pour Théo Bernard" }),
    );
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    );
    expect(context.onRemoveGoal).toHaveBeenCalledWith("match-live", "goal-1");
  });

  it("permet de supprimer un but depuis la liste même après le délai du slider", () => {
    const { context } = renderLivePage({
      ...liveMatch,
      goals: [
        {
          ...liveMatch.goals![0],
          createdAt: new Date(Date.now() - 11000).toISOString(),
        },
      ],
    });

    const removeGoalButton = screen.getByRole("button", {
      name: "Supprimer le but de Lucas Martin",
    });
    expect(
      screen.queryByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    ).not.toBeInTheDocument();
    fireEvent.click(removeGoalButton);
    expect(context.onRemoveGoal).toHaveBeenCalledWith("match-live", "goal-1");
  });

  it("réinitialise le slider d’annulation au but suivant du même joueur", () => {
    const previousGoal = {
      ...liveMatch.goals![0],
      createdAt: new Date(Date.now() - 7000).toISOString(),
    };
    const { context, rerender } = renderLivePage({
      ...liveMatch,
      goals: [previousGoal],
    });
    const undoButton = screen.getByRole("button", {
      name: "Annuler le dernier but de Lucas Martin",
    });
    const slider = undoButton.querySelector("span[aria-hidden='true']");
    expect(
      Number.parseInt((slider as HTMLElement).style.animationDelay, 10),
    ).toBeLessThan(-6000);

    const nextGoal = {
      ...previousGoal,
      id: "goal-2",
      createdAt: new Date(Date.now() + 60_000).toISOString(),
    };
    context.allMatches = [{ ...liveMatch, goals: [previousGoal, nextGoal] }];
    rerender(
      <MemoryRouter initialEntries={["/app/live?match=match-live"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="live" element={<LiveMatchPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole("button", {
          name: "Annuler le dernier but de Lucas Martin",
        })
        .querySelector("span[aria-hidden='true']"),
    ).toHaveStyle({ animationDelay: "-0ms" });
  });

  it("confirme le but précédent lorsqu’un autre joueur marque", () => {
    const previousGoal = {
      ...liveMatch.goals![0],
      createdAt: new Date(Date.now() - 3000).toISOString(),
    };
    const { context, rerender } = renderLivePage({
      ...liveMatch,
      goals: [previousGoal],
    });

    expect(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    ).toBeInTheDocument();

    const nextGoal = {
      ...previousGoal,
      id: "goal-2",
      scorerId: "theo",
      team: 1 as const,
      createdAt: new Date().toISOString(),
    };
    context.allMatches = [{ ...liveMatch, goals: [previousGoal, nextGoal] }];
    rerender(
      <MemoryRouter initialEntries={["/app/live?match=match-live"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="live" element={<LiveMatchPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("button", {
        name: "Annuler le dernier but de Lucas Martin",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Théo Bernard",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Supprimer le but de Lucas Martin" }),
    ).toBeInTheDocument();
  });

  it("ne réactive pas l’annulation du but précédent après avoir annulé le suivant", () => {
    const firstGoal = {
      ...liveMatch.goals![0],
      id: "goal-first",
      scorerId: "theo",
      team: 1 as const,
      undoable: false,
      createdAt: new Date(Date.now() - 3000).toISOString(),
    };
    const secondGoal = {
      ...firstGoal,
      id: "goal-second",
      undoable: true,
      createdAt: new Date().toISOString(),
    };
    const { context, rerender } = renderLivePage({
      ...liveMatch,
      goals: [firstGoal, secondGoal],
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Annuler le dernier but de Théo Bernard",
      }),
    );
    expect(context.onRemoveGoal).toHaveBeenCalledWith(
      "match-live",
      "goal-second",
    );

    context.allMatches = [{ ...liveMatch, goals: [firstGoal] }];
    rerender(
      <MemoryRouter initialEntries={["/app/live?match=match-live"]}>
        <Routes>
          <Route path="/app" element={<Outlet context={context} />}>
            <Route path="live" element={<LiveMatchPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.queryByRole("button", {
        name: "Annuler le dernier but de Théo Bernard",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Supprimer le but de Théo Bernard" }),
    ).toBeInTheDocument();
  });

  it("ne montre pas un match terminé dans l’onglet En direct, même demandé par son identifiant", () => {
    renderLivePage({
      ...liveMatch,
      status: "finished",
      startedAt: undefined,
      elapsedSeconds: 3600,
    });

    expect(
      screen.getByRole("heading", { name: "Matchs à lancer" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Aucun match complet à lancer pour le moment."),
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
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Composition du match",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.querySelectorAll(".match-drawer-backdrop")).toHaveLength(
        0,
      ),
    );
    expect(document.body.style.overflow).toBe("");
    expect(document.getElementById("match-composition-drawer")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    await screen.findByRole("dialog", { name: "Composition du match" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Composition du match",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.querySelectorAll(".match-drawer-backdrop")).toHaveLength(
        0,
      ),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("masque score, actions et événements avant le coup d’envoi", () => {
    renderLivePage({
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
      goals: [],
    });

    expect(
      screen.queryByRole("heading", { name: "Actions rapides" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Buts & événements" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Score du match" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.queryByText("0 buts")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Lancer le match de Five du dimanche · Terrain 3",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("2 joueurs confirmés")).not.toBeInTheDocument();
  });

  it("liste les matchs complets et lance celui choisi avec sa composition", () => {
    const firstScheduledMatch: MatchSlot = {
      ...liveMatch,
      id: "match-first",
      venue: "Terrain du parc",
      status: "scheduled",
      startedAt: undefined,
      goals: [],
    };
    const secondScheduledMatch: MatchSlot = {
      ...firstScheduledMatch,
      id: "match-second",
      venue: "Terrain couvert",
    };
    const { context } = renderLivePage(firstScheduledMatch, [
      firstScheduledMatch,
      secondScheduledMatch,
    ]);

    expect(
      screen.getByRole("heading", { name: "Terrain du parc" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Terrain couvert" }),
    ).toBeInTheDocument();
    const launchButton = screen.getByRole("button", {
      name: "Lancer le match de Terrain couvert",
    });
    expect(launchButton).toHaveClass("bg-(--team-b-blue)");
    fireEvent.click(launchButton);
    expect(context.onStartMatch).toHaveBeenCalledWith("match-second", [
      ["lucas"],
      ["theo"],
    ]);
  });

  it("affiche les erreurs d’action dans la liste des matchs à lancer", () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
    };
    renderLivePage(
      scheduledMatch,
      [scheduledMatch],
      "Impossible de lancer le match.",
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de lancer le match.",
    );
  });

  it("affiche les erreurs d’enregistrement dans le drawer de composition", async () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
    };
    renderLivePage(
      scheduledMatch,
      [scheduledMatch],
      "Impossible d’enregistrer la composition.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    const composition = await screen.findByRole("dialog", {
      name: "Composition du match",
    });

    expect(within(composition).getByRole("alert")).toHaveTextContent(
      "Impossible d’enregistrer la composition.",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("propose les créneaux complets historiques sans statut", () => {
    const legacyMatch: MatchSlot = {
      ...liveMatch,
      status: undefined,
      startedAt: undefined,
    };
    renderLivePage(legacyMatch);

    expect(
      screen.getByRole("button", {
        name: "Lancer le match de Five du dimanche · Terrain 3",
      }),
    ).toBeInTheDocument();
  });

  it("n’affiche que le match actif même si d’autres matchs sont prêts", () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      id: "match-scheduled",
      venue: "Terrain en attente",
      status: "scheduled",
      startedAt: undefined,
      goals: [],
    };
    renderLivePage(liveMatch, [scheduledMatch, liveMatch]);

    expect(
      screen.getByRole("timer", { name: "Temps de jeu" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Terrain en attente")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Matchs à lancer" }),
    ).not.toBeInTheDocument();
  });

  it("permet de modifier la composition depuis le drawer Voir la compo", async () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
    };
    const { context } = renderLivePage(scheduledMatch);

    expect(
      screen.queryByRole("button", {
        name: "Ajouter un but pour Lucas Martin",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Échanger deux joueurs" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    const composition = await screen.findByRole("dialog", {
      name: "Composition du match",
    });
    fireEvent.click(
      within(composition).getByRole("button", {
        name: "Modifier la composition",
      }),
    );
    fireEvent.click(
      within(composition).getByRole("button", {
        name: "Sélectionner Lucas Martin dans l'équipe rouge",
      }),
    );
    fireEvent.click(
      within(composition).getByRole("button", {
        name: "Sélectionner Théo Bernard dans l'équipe bleue",
      }),
    );
    fireEvent.click(
      within(composition).getByRole("button", {
        name: "Échanger les joueurs sélectionnés",
      }),
    );

    await waitFor(() =>
      expect(context.onSaveScheduledMatchTeams).toHaveBeenCalledWith(
        "match-live",
        [["theo"], ["lucas"]],
      ),
    );
    expect(context.onSwapPlayers).not.toHaveBeenCalled();
    fireEvent.click(
      within(composition).getByRole("button", {
        name: "Fermer la composition",
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Composition du match",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(document.querySelectorAll(".match-drawer-backdrop")).toHaveLength(
        0,
      ),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("permet d’échanger deux joueurs d’équipes opposées", async () => {
    const match: MatchSlot = {
      ...liveMatch,
      teams: [["lucas"], ["theo"]],
    };
    const { context } = renderLivePage(match);
    vi.mocked(context.onSwapPlayers).mockImplementation(() => {
      match.teams = [["theo"], ["lucas"]];
    });

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
    expect(
      within(swapDialog).queryByRole("button", {
        name: "Échanger les joueurs",
      }),
    ).not.toBeInTheDocument();
    const redPlayer = within(swapDialog).getByRole("button", {
      name: "Sélectionner Lucas Martin dans l'équipe rouge",
    });
    expect(redPlayer.querySelector("span[aria-hidden='true']")).toHaveClass(
      "size-4.5",
      "border-current/60",
    );
    fireEvent.click(redPlayer);
    expect(redPlayer).toHaveAttribute("aria-pressed", "true");
    expect(redPlayer.querySelector("span[aria-hidden='true']")).toHaveClass(
      "bg-current/15",
    );
    expect(
      redPlayer.querySelector("span[aria-hidden='true'] svg"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(swapDialog).getByRole("button", {
        name: "Sélectionner Théo Bernard dans l'équipe bleue",
      }),
    );
    expect(context.onSwapPlayers).toHaveBeenCalledWith(
      "match-live",
      "lucas",
      "theo",
    );
    await waitFor(() => {
      expect(swapDialog).toHaveFocus();
      expect(
        within(
          within(swapDialog).getByRole("region", { name: "Équipe rouge" }),
        ).getByRole("button", {
          name: "Sélectionner Théo Bernard dans l'équipe rouge",
        }),
      ).toBeInTheDocument();
      expect(
        within(
          within(swapDialog).getByRole("region", { name: "Équipe bleue" }),
        ).getByRole("button", {
          name: "Sélectionner Lucas Martin dans l'équipe bleue",
        }),
      ).toBeInTheDocument();
    });
    expect(document.body.style.overflow).toBe("hidden");
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
      expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus(),
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
    await waitFor(() =>
      expect(
        screen.queryByRole("alertdialog", {
          name: "Siffler la fin du match ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("demande confirmation avant de réinitialiser le match sélectionné", async () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    const resetDialog = await screen.findByRole("alertdialog", {
      name: "Réinitialiser ce match ?",
    });
    expect(resetDialog).toHaveTextContent("tous les buts seront effacés");
    expect(resetDialog).toHaveTextContent("statistiques joueurs");

    fireEvent.click(
      within(resetDialog).getByRole("button", {
        name: "Confirmer le reset",
      }),
    );

    await waitFor(() =>
      expect(context.onResetMatch).toHaveBeenCalledWith("match-live"),
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

    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter un but pour Théo Bernard" }),
    );
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");

    fireEvent.click(
      screen.getByRole("button", { name: "Échanger deux joueurs" }),
    );
    const swapDialog = await screen.findByRole("dialog", {
      name: "Quels joueurs échanger ?",
    });
    expect(
      screen.getByRole("dialog", { name: "Quels joueurs échanger ?" }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(swapDialog).getByRole("button", {
        name: "Sélectionner Lucas Martin dans l'équipe rouge",
      }),
    );
    fireEvent.click(
      within(swapDialog).getByRole("button", {
        name: "Sélectionner Théo Bernard dans l'équipe bleue",
      }),
    );
    expect(context.onSwapPlayers).toHaveBeenCalledWith(
      "match-live",
      "lucas",
      "theo",
    );
    expect(swapDialog).toBeInTheDocument();
    fireEvent.click(
      within(swapDialog).getByRole("button", {
        name: "Annuler l’échange des joueurs",
      }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "Quels joueurs échanger ?",
          hidden: true,
        }),
      ).not.toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Ajouter un but pour Théo Bernard" }),
    );
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");
  });
});
