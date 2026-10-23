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

function renderLivePage() {
  const context = {
    allMatches: [liveMatch],
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
    onSwitchTeam: vi.fn(),
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
    expect(
      within(
        screen.getByRole("list", { name: "Événements du match" }),
      ).getByText("Lucas Martin"),
    ).toBeInTheDocument();
    expect(screen.getByText("Valider le but")).toBeDisabled();
  });

  it("permet de valider un but et de changer un joueur d’équipe", () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "Bleue" }));
    fireEvent.change(screen.getByLabelText("Buteur"), {
      target: { value: "theo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider le but" }));
    expect(context.onRecordGoal).toHaveBeenCalledWith("match-live", "theo");

    fireEvent.change(screen.getByLabelText("Joueur"), {
      target: { value: "lucas" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Changer d’équipe" }));
    expect(context.onSwitchTeam).toHaveBeenCalledWith("match-live", "lucas");
  });

  it("propose la pause et la fin pendant le match", () => {
    const { context } = renderLivePage();

    fireEvent.click(screen.getByRole("button", { name: "Mettre en pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Siffler la fin" }));

    expect(context.onSetMatchState).toHaveBeenNthCalledWith(
      1,
      "match-live",
      "pause",
    );
    expect(context.onSetMatchState).toHaveBeenNthCalledWith(
      2,
      "match-live",
      "finish",
    );
  });
});
