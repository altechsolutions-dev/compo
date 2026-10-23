import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("affiche la composition uniquement à la demande avant le coup d’envoi", () => {
    const scheduledMatch: MatchSlot = {
      ...liveMatch,
      status: "scheduled",
      startedAt: undefined,
    };
    renderLivePage(scheduledMatch);

    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    const composition = screen.getByRole("dialog", {
      name: "Composition du match",
    });
    expect(within(composition).getByText("Lucas Martin")).toBeInTheDocument();
    expect(within(composition).getByText("Théo Bernard")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Fermer la composition" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voir la compo" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Composition du match" }),
    ).not.toBeInTheDocument();
  });

  it("permet de valider un but et d’échanger deux joueurs d’équipes opposées", () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    expect(
      screen.getByRole("dialog", { name: "Qui a marqué ?" }),
    ).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: "Qui a marqué ?" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    fireEvent.click(screen.getByRole("button", { name: "Théo Bernard" }));
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");
    expect(
      screen.queryByRole("dialog", { name: "Qui a marqué ?" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Échanger deux joueurs"));
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe rouge"), {
      target: { value: "lucas" },
    });
    fireEvent.change(screen.getByLabelText("Joueur de l’équipe bleue"), {
      target: { value: "theo" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Échanger les joueurs" }),
    );
    expect(context.onSwapPlayers).toHaveBeenCalledWith(
      "match-live",
      "lucas",
      "theo",
    );
  });

  it("propose la pause et la fin pendant le match", () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Siffler la fin" }));

    expect(context.onSetMatchState).toHaveBeenCalledWith("match-live", "pause");
    expect(context.onSetMatchState).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer la fin" }));
    expect(context.onSetMatchState).toHaveBeenCalledWith(
      "match-live",
      "finish",
    );
  });

  it("garde les actions de saisie disponibles pendant la pause", () => {
    const pausedMatch: MatchSlot = {
      ...liveMatch,
      status: "paused",
      startedAt: undefined,
      elapsedSeconds: 84,
    };
    const { context } = renderLivePage(pausedMatch);

    fireEvent.click(screen.getByRole("button", { name: "But !" }));
    fireEvent.click(screen.getByRole("button", { name: "Théo Bernard" }));
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");

    fireEvent.click(screen.getByText("Échanger deux joueurs"));
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
