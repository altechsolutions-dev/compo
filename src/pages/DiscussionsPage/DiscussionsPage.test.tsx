import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { DiscussionsPage } from "./DiscussionsPage";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

const { rpc, notify } = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("../../lib/supabase/supabase", () => ({
  supabase: { rpc },
}));

vi.mock("../../lib/pushNotifications/notifyMatchEvent", () => ({
  notifyMatchEvent: notify,
}));

const match = {
  id: "match-1",
  date: "2026-10-29",
  time: "19:30",
  venue: "Urban Soccer",
  maxPlayers: 10,
  attendees: ["user-1"],
  createdBy: "user-1",
  status: "scheduled" as const,
};

const context = {
  organization: "Les Panthères",
  organizationId: "club-1",
  allMatches: [match],
  currentUserId: "user-1",
  isOrganizationOwner: true,
  onDiscussionRead: vi.fn(),
} as unknown as WorkspaceRouteContext;

function renderPage(routeContext: WorkspaceRouteContext = context) {
  return render(
    <MemoryRouter initialEntries={["/app/discussions?match=match-1"]}>
      <Routes>
        <Route element={<Outlet context={routeContext} />}>
          <Route path="/app/discussions" element={<DiscussionsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("DiscussionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    let messages: {
      id: string;
      author_id: string;
      author_name: string;
      body: string;
      created_at: string;
    }[] = [];
    rpc.mockImplementation(async (name: string) => {
      if (name === "send_match_discussion_message") {
        const message = {
          id: "message-1",
          author_id: "user-1",
          author_name: "Alice",
          body: "Rendez-vous à 19 h !",
          created_at: "2026-10-29T18:00:00.000Z",
        };
        messages = [message];
        return { data: [message], error: null };
      }
      if (name === "get_match_discussion_messages_with_readers") {
        return { data: messages, error: null };
      }
      if (name === "get_match_discussions") {
        return { data: [], error: null };
      }
      return { data: null, error: null };
    });
  });

  it("envoie un message et notifie les autres membres du club", async () => {
    renderPage();

    const composer = await screen.findByRole("textbox", {
      name: "Votre message",
    });
    expect(composer.closest("form")).toHaveClass("fixed", "bottom-0");
    fireEvent.change(composer, { target: { value: "Rendez-vous à 19 h !" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });

    expect(await screen.findByText("Rendez-vous à 19 h !")).toBeInTheDocument();
    await waitFor(() => {
      expect(notify).toHaveBeenCalledWith(
        "chat_message",
        "match-1",
        undefined,
        "message-1",
      );
    });
    expect(rpc).toHaveBeenCalledWith("send_match_discussion_message", {
      p_match_id: "match-1",
      p_body: "Rendez-vous à 19 h !",
    });
  });

  it("ferme le sélecteur après le choix d’une discussion", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_match_discussions") {
        return {
          data: [
            {
              match_id: "match-1",
              match_date: "2026-10-29",
              match_time: "19:30",
              venue: "Urban Soccer",
              status: "scheduled",
              last_message_body: "À ce soir",
              last_author_name: "Alice",
              last_message_at: "2026-10-29T18:00:00.000Z",
              has_unread: false,
            },
            {
              match_id: "match-2",
              match_date: "2026-10-30",
              match_time: "20:00",
              venue: "Gymnase Nord",
              status: "scheduled",
              last_message_body: "On confirme ?",
              last_author_name: "Sam",
              last_message_at: "2026-10-29T18:10:00.000Z",
              has_unread: true,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    renderPage();

    const picker = screen.getByRole("button", {
      name: "Changer de discussion : Urban Soccer",
    });
    expect(picker).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(picker);
    expect(picker).toHaveAttribute("aria-expanded", "true");

    const discussionList = screen.getByRole("navigation", {
      name: "Liste des discussions",
    });
    const unreadThread = await within(discussionList).findByRole("button", {
      name: /Gymnase Nord/,
    });
    const readThread = within(discussionList).getByRole("button", {
      name: /Urban Soccer/,
    });
    const unreadDot = within(unreadThread).getByRole("img", {
      name: "Messages non lus",
    });
    expect(unreadDot).toHaveClass("ml-auto");
    expect(
      within(readThread).queryByRole("img", { name: "Messages non lus" }),
    ).not.toBeInTheDocument();

    fireEvent.click(unreadThread);
    expect(picker).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => {
      expect(
        within(unreadThread).queryByRole("img", { name: "Messages non lus" }),
      ).not.toBeInTheDocument();
    });
  });

  it("ne soumet pas le message avec Maj+Entrée", async () => {
    renderPage();

    const composer = await screen.findByRole("textbox", {
      name: "Votre message",
    });
    fireEvent.change(composer, { target: { value: "Première ligne" } });
    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(rpc).not.toHaveBeenCalledWith(
      "send_match_discussion_message",
      expect.anything(),
    );
  });

  it("permet de modifier uniquement son propre message", async () => {
    let messages = [
      {
        id: "message-own",
        author_id: "user-1",
        author_name: "Alice",
        body: "Ancienne version",
        created_at: "2026-10-29T18:00:00.000Z",
      },
      {
        id: "message-other",
        author_id: "user-2",
        author_name: "Sam",
        body: "Message d’un autre joueur",
        created_at: "2026-10-29T18:01:00.000Z",
      },
    ];
    rpc.mockImplementation(
      async (name: string, args: Record<string, string>) => {
        if (name === "get_match_discussion_messages_with_readers") {
          return { data: messages, error: null };
        }
        if (name === "edit_match_discussion_message") {
          messages = messages.map((message) =>
            message.id === args.p_message_id
              ? { ...message, body: args.p_body }
              : message,
          );
          return { data: [messages[0]], error: null };
        }
        return { data: [], error: null };
      },
    );
    renderPage();

    const ownMessage = await screen.findByText("Ancienne version");
    const otherMessage = screen.getByText("Message d’un autre joueur");
    expect(ownMessage.closest("li")?.firstElementChild).toHaveClass(
      "bg-(--team-b-blue)/10",
    );
    expect(otherMessage.closest("li")?.firstElementChild).toHaveClass(
      "bg-(--bg-surface)",
    );
    expect(
      screen.getAllByRole("button", { name: "Modifier mon message" }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: "Supprimer mon message" }),
    ).toHaveLength(1);
    fireEvent.click(
      screen.getByRole("button", { name: "Modifier mon message" }),
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Modifier mon message" }),
      {
        target: { value: "Version corrigée" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer la modification" }),
    );

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("edit_match_discussion_message", {
        p_message_id: "message-own",
        p_body: "Version corrigée",
      });
    });
    expect(await screen.findByText("Version corrigée")).toBeInTheDocument();
  });

  it("supprime son propre message via la RPC dédiée", async () => {
    const ownMessage = {
      id: "message-own",
      author_id: "user-1",
      author_name: "Alice",
      body: "À supprimer",
      created_at: "2026-10-29T18:00:00.000Z",
    };
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_match_discussion_messages_with_readers") {
        return { data: [ownMessage], error: null };
      }
      return { data: null, error: null };
    });
    renderPage();

    expect(await screen.findByText("À supprimer")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Supprimer mon message" }),
    );

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith("delete_match_discussion_message", {
        p_message_id: "message-own",
      });
      expect(screen.queryByText("À supprimer")).not.toBeInTheDocument();
    });
  });

  it("refuse l’accès au fil via son ancienne URL après la fin du match", async () => {
    const finishedContext = {
      ...context,
      allMatches: [{ ...match, status: "finished" as const }],
    };
    renderPage(finishedContext);

    expect(
      await screen.findByText(
        "Cette discussion a été supprimée à la fin du match.",
      ),
    ).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalledWith(
      "get_match_discussion_messages_with_readers",
      expect.anything(),
    );
  });

  it("affiche les joueurs qui ont lu un de mes messages", async () => {
    rpc.mockImplementation(async (name: string) => {
      if (name === "get_match_discussion_messages_with_readers") {
        return {
          data: [
            {
              id: "message-own",
              author_id: "user-1",
              author_name: "Alice",
              body: "On se retrouve à 19 h.",
              created_at: "2026-10-29T18:00:00.000Z",
              readers: [{ user_id: "user-2", display_name: "Sam Martin" }],
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    });
    renderPage();

    expect(
      await screen.findByRole("img", { name: "Sam Martin" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Lu par Sam Martin")).toBeInTheDocument();
    expect(screen.queryByText("Lu par")).not.toBeInTheDocument();
    const readerAvatar = screen.getByRole("img", { name: "Sam Martin" });
    const messageRow = readerAvatar.closest("li");
    expect(messageRow?.lastElementChild).toContainElement(readerAvatar);
    expect(messageRow?.lastElementChild).not.toBe(
      messageRow?.firstElementChild,
    );
    expect(context.onDiscussionRead).toHaveBeenCalled();
  });
});
