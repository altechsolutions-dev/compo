import {
  Check,
  ChevronDown,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import type { MatchSlot } from "../../types";
import { notifyMatchEvent } from "../../lib/pushNotifications/notifyMatchEvent";
import { supabase } from "../../lib/supabase/supabase";
import type { WorkspaceRouteContext } from "../WorkspaceLayout/WorkspaceRouteContext";

type DiscussionSummary = {
  match_id: string;
  match_date: string;
  match_time: string;
  venue: string;
  status: MatchSlot["status"];
  last_message_body: string;
  last_author_name: string;
  last_message_at: string;
  has_unread: boolean;
};

type DiscussionMessage = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  readers?: { user_id: string; display_name: string }[];
};

const emptyDiscussionSummaries: DiscussionSummary[] = [];

function formatMatchDate(date: string, time: string) {
  const parsedDate = new Date(`${date}T12:00:00`);
  return `${new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(parsedDate)
    .replace(".", "")} · ${time}`;
}

export function DiscussionsPage() {
  const {
    organization,
    organizationId,
    allMatches,
    currentUserId,
    isOrganizationOwner,
    onDiscussionRead,
  } = useOutletContext<WorkspaceRouteContext>();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeMatchId = searchParams.get("match");
  const [summaryState, setSummaryState] = useState<{
    organizationId: string | null;
    summaries: DiscussionSummary[];
  }>({ organizationId: null, summaries: [] });
  const [messageState, setMessageState] = useState<{
    matchId: string | undefined;
    messages: DiscussionMessage[];
  }>({ matchId: undefined, messages: [] });
  const [draft, setDraft] = useState("");
  const [discussionPickerOpen, setDiscussionPickerOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const summaries =
    summaryState.organizationId === organizationId
      ? summaryState.summaries
      : emptyDiscussionSummaries;

  useEffect(() => {
    const client = supabase;
    if (!client || !organizationId) return;

    let cancelled = false;
    const refresh = async () => {
      const { data, error } = await client.rpc("get_match_discussions", {
        p_organization_id: organizationId,
      });
      if (cancelled) return;
      if (error) {
        setNotice(`Impossible de charger les discussions : ${error.message}`);
        return;
      }
      setSummaryState({
        organizationId,
        summaries: (data ?? []) as DiscussionSummary[],
      });
      setNotice("");
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [organizationId, refreshVersion]);

  const selectedMatchId = routeMatchId ?? summaries[0]?.match_id;
  const selectedSummary = summaries.find(
    (summary) => summary.match_id === selectedMatchId,
  );
  const selectedMatch =
    allMatches.find((match) => match.id === selectedMatchId) ??
    (selectedSummary
      ? {
          id: selectedSummary.match_id,
          date: selectedSummary.match_date,
          time: selectedSummary.match_time,
          venue: selectedSummary.venue,
          maxPlayers: 0,
          attendees: [],
          status: selectedSummary.status,
        }
      : undefined);
  const messages =
    selectedMatch?.status !== "finished" &&
    messageState.matchId === selectedMatchId
      ? messageState.messages
      : [];

  useEffect(() => {
    const client = supabase;
    if (!selectedMatchId || !client || selectedMatch?.status === "finished") {
      return;
    }

    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      const { data, error } = await client.rpc(
        "get_match_discussion_messages_with_readers",
        { p_match_id: selectedMatchId },
      );
      if (cancelled) return;
      if (error) {
        setMessageState({ matchId: selectedMatchId, messages: [] });
        setNotice(`Impossible de charger les messages : ${error.message}`);
        return;
      }
      setMessageState({
        matchId: selectedMatchId,
        messages: (data ?? []) as DiscussionMessage[],
      });
      setSummaryState((current) =>
        current.organizationId === organizationId
          ? {
              ...current,
              summaries: current.summaries.map((summary) =>
                summary.match_id === selectedMatchId
                  ? { ...summary, has_unread: false }
                  : summary,
              ),
            }
          : current,
      );
      onDiscussionRead?.();
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    organizationId,
    onDiscussionRead,
    selectedMatch?.status,
    selectedMatchId,
    refreshVersion,
  ]);

  useEffect(() => {
    if (!routeMatchId && summaries.length > 0) {
      setSearchParams({ match: summaries[0].match_id }, { replace: true });
    }
  }, [routeMatchId, summaries, setSearchParams]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!supabase || !selectedMatch || !body || busy) return;
    setBusy(true);
    setNotice("");
    const { data, error } = await supabase.rpc(
      "send_match_discussion_message",
      { p_match_id: selectedMatch.id, p_body: body },
    );
    setBusy(false);
    if (error) {
      setNotice(`Le message n’a pas été envoyé : ${error.message}`);
      return;
    }
    const message = (data?.[0] ?? null) as DiscussionMessage | null;
    if (!message) {
      setNotice("Le message n’a pas été confirmé par le serveur.");
      return;
    }
    setDraft("");
    setMessageState((current) => ({
      matchId: selectedMatch.id,
      messages: [
        ...(current.matchId === selectedMatch.id ? current.messages : []),
        message,
      ],
    }));
    setRefreshVersion((version) => version + 1);
    void notifyMatchEvent(
      "chat_message",
      selectedMatch.id,
      undefined,
      message.id,
    );
  }

  async function deleteDiscussion() {
    if (!supabase || !selectedMatch || busy) return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.rpc("delete_match_discussion", {
      p_match_id: selectedMatch.id,
    });
    setBusy(false);
    if (error) {
      setNotice(`La discussion n’a pas été supprimée : ${error.message}`);
      return;
    }
    setMessageState({ matchId: selectedMatch.id, messages: [] });
    setSummaryState((current) => ({
      organizationId,
      summaries: current.summaries.filter(
        (summary) => summary.match_id !== selectedMatch.id,
      ),
    }));
    setSearchParams({}, { replace: true });
    setNotice("Discussion supprimée.");
  }

  async function saveMessageEdit(messageId: string) {
    const body = editDraft.trim();
    if (!supabase || !body || busy) return;
    setBusy(true);
    setNotice("");
    const { data, error } = await supabase.rpc(
      "edit_match_discussion_message",
      { p_message_id: messageId, p_body: body },
    );
    setBusy(false);
    if (error) {
      setNotice(`Le message n’a pas été modifié : ${error.message}`);
      return;
    }
    const updatedMessage = (data?.[0] ?? null) as DiscussionMessage | null;
    if (!updatedMessage) {
      setNotice("La modification n’a pas été confirmée par le serveur.");
      return;
    }
    setMessageState((current) => ({
      matchId: selectedMatchId,
      messages: current.messages.map((message) =>
        message.id === messageId ? updatedMessage : message,
      ),
    }));
    setEditingMessageId(null);
    setEditDraft("");
    setRefreshVersion((version) => version + 1);
  }

  async function deleteMessage(messageId: string) {
    if (!supabase || busy) return;
    setBusy(true);
    setNotice("");
    const { error } = await supabase.rpc("delete_match_discussion_message", {
      p_message_id: messageId,
    });
    setBusy(false);
    if (error) {
      setNotice(`Le message n’a pas été supprimé : ${error.message}`);
      return;
    }
    setMessageState((current) => ({
      matchId: selectedMatchId,
      messages: current.messages.filter((message) => message.id !== messageId),
    }));
    setRefreshVersion((version) => version + 1);
    setNotice("Message supprimé.");
  }

  const mayDelete =
    selectedMatch?.status === "finished" &&
    (isOrganizationOwner || selectedMatch.createdBy === currentUserId);
  const maySend =
    selectedMatch?.status !== "finished" &&
    selectedMatch?.status !== "cancelled" &&
    Boolean(supabase);

  return (
    <section
      className="py-8 pb-12 max-[700px]:pb-[calc(8rem+env(safe-area-inset-bottom))]"
      aria-labelledby="discussions-title"
    >
      <div className="mb-6 border-b border-(--line) pb-5">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[1.5px] text-(--text-secondary)">
          {organization}
        </p>
        <h1
          className="m-0 flex items-center gap-2 text-2xl font-bold text-(--ink)"
          id="discussions-title"
        >
          <MessageCircle aria-hidden="true" size={22} /> Discussions
        </h1>
      </div>
      <div className="grid min-h-[min(68svh,720px)] grid-cols-[minmax(220px,0.8fr)_minmax(0,1.8fr)] max-[700px]:grid-cols-1">
        <button
          aria-controls="discussion-list"
          aria-expanded={discussionPickerOpen}
          aria-label={
            selectedMatch
              ? `Changer de discussion : ${selectedMatch.venue}`
              : "Choisir une discussion"
          }
          className="hidden w-full cursor-pointer items-center justify-between border-b border-(--line) px-4 py-3 text-left max-[700px]:flex"
          onClick={() => setDiscussionPickerOpen((open) => !open)}
          type="button"
        >
          <span className="min-w-0">
            {selectedMatch ? (
              <>
                <span className="block text-[10px] font-semibold text-(--team-b-blue)">
                  Discussion active ·{" "}
                  {formatMatchDate(selectedMatch.date, selectedMatch.time)}
                </span>
                <span className="mt-1 block truncate text-sm font-bold text-(--ink)">
                  {selectedMatch.venue}
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold text-(--ink)">
                Choisir une discussion
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`transition-transform ${discussionPickerOpen ? "rotate-180" : ""}`}
            size={16}
          />
        </button>
        <nav
          className={`min-w-0 border-r border-(--line) max-[700px]:border-r-0 max-[700px]:border-b ${discussionPickerOpen ? "max-[700px]:block" : "max-[700px]:hidden"}`}
          aria-label="Liste des discussions"
          id="discussion-list"
        >
          <h2 className="border-b border-(--line) px-4 py-3 text-xs font-bold text-(--ink)">
            Fils de discussion{" "}
            <span className="text-(--text-secondary)">{summaries.length}</span>
          </h2>
          {summaries.length === 0 ? (
            <p className="px-4 py-5 text-xs leading-relaxed text-(--text-secondary)">
              Aucun fil pour le moment. Ouvre la discussion depuis une carte de
              match pour démarrer.
            </p>
          ) : (
            <ul className="m-0 max-h-[min(68svh,720px)] list-none overflow-y-auto p-0">
              {summaries.map((summary) => (
                <li key={summary.match_id}>
                  <button
                    aria-current={
                      selectedMatchId === summary.match_id ? "page" : undefined
                    }
                    className={`w-full cursor-pointer border-0 border-b border-(--line) px-4 py-3 text-left ${selectedMatchId === summary.match_id ? "bg-(--bg-elevated)" : "bg-transparent hover:bg-(--bg-surface)"}`}
                    onClick={() => {
                      setSearchParams({ match: summary.match_id });
                      setDiscussionPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="block text-[10px] font-semibold text-(--team-b-blue)">
                      {formatMatchDate(summary.match_date, summary.match_time)}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-2 text-xs font-bold text-(--ink)">
                      <span className="min-w-0 flex-1 truncate">
                        {summary.venue}
                      </span>
                      {summary.has_unread && (
                        <span
                          aria-label="Messages non lus"
                          className="ml-auto size-2 shrink-0 rounded-full bg-(--team-a-red)"
                          role="img"
                        />
                      )}
                    </span>
                    <span className="mt-1 block truncate text-[11px] text-(--text-secondary)">
                      {summary.last_author_name}: {summary.last_message_body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <div className="flex min-h-[min(68svh,720px)] min-w-0 flex-col">
          {selectedMatch?.status === "finished" ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-xs text-(--text-secondary)">
              Cette discussion a été supprimée à la fin du match.
            </div>
          ) : selectedMatch ? (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-(--line) px-4 py-3 max-[700px]:hidden">
                <div className="min-w-0">
                  <p className="m-0 text-[10px] font-semibold text-(--team-b-blue)">
                    {formatMatchDate(selectedMatch.date, selectedMatch.time)}
                  </p>
                  <h2 className="mb-0 mt-1 truncate text-sm font-bold text-(--ink)">
                    {selectedMatch.venue}
                  </h2>
                </div>
                {mayDelete && (
                  <button
                    aria-label="Supprimer la discussion"
                    className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md border border-(--line) bg-transparent text-(--text-secondary) hover:border-(--team-a-red) hover:text-(--team-a-red) disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void deleteDiscussion()}
                    title="Supprimer la discussion terminée"
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                )}
              </header>
              <ol
                aria-label="Messages"
                aria-live="polite"
                className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 max-[700px]:pb-[calc(6rem+env(safe-area-inset-bottom))]"
              >
                {messages.length === 0 ? (
                  <li className="m-auto list-none text-center text-xs text-(--text-secondary)">
                    Aucun message. Lance la discussion avec l’équipe.
                  </li>
                ) : (
                  messages.map((message) => {
                    const mine = message.author_id === currentUserId;
                    return (
                      <li
                        className={`flex w-full list-none flex-col ${mine ? "items-end" : "items-start"}`}
                        key={message.id}
                      >
                        <div
                          className={`max-w-[min(85%,520px)] rounded-lg border px-3 py-2 ${mine ? "border-(--team-b-blue)/35 bg-(--team-b-blue)/10" : "border-(--line) bg-(--bg-surface)"}`}
                        >
                          <p className="m-0 flex items-baseline justify-between gap-5 text-[10px] font-bold text-(--team-b-blue)">
                            <span>{mine ? "Vous" : message.author_name}</span>
                            <span className="flex items-center gap-2 font-normal text-(--text-secondary)">
                              <time>
                                {new Date(
                                  message.created_at,
                                ).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                              {mine && maySend && (
                                <span className="flex items-center gap-1">
                                  <button
                                    aria-label="Modifier mon message"
                                    className="grid size-7 cursor-pointer place-items-center rounded border border-(--line) bg-transparent text-(--text-secondary) hover:text-(--team-b-blue) disabled:opacity-50"
                                    disabled={busy}
                                    onClick={() => {
                                      setEditingMessageId(message.id);
                                      setEditDraft(message.body);
                                    }}
                                    title="Modifier mon message"
                                    type="button"
                                  >
                                    <Pencil aria-hidden="true" size={13} />
                                  </button>
                                  <button
                                    aria-label="Supprimer mon message"
                                    className="grid size-7 cursor-pointer place-items-center rounded border border-(--line) bg-transparent text-(--text-secondary) hover:text-(--team-a-red) disabled:opacity-50"
                                    disabled={busy}
                                    onClick={() =>
                                      void deleteMessage(message.id)
                                    }
                                    title="Supprimer mon message"
                                    type="button"
                                  >
                                    <Trash2 aria-hidden="true" size={13} />
                                  </button>
                                </span>
                              )}
                            </span>
                          </p>
                          {editingMessageId === message.id ? (
                            <form
                              className="mt-2 flex items-end gap-1.5"
                              onSubmit={(event) => {
                                event.preventDefault();
                                void saveMessageEdit(message.id);
                              }}
                            >
                              <label
                                className="sr-only"
                                htmlFor={`edit-message-${message.id}`}
                              >
                                Modifier mon message
                              </label>
                              <textarea
                                className="min-h-10 min-w-0 flex-1 resize-none rounded border border-(--line) bg-(--bg-main) px-2 py-1.5 text-xs text-(--ink) outline-none focus:border-(--team-b-blue)"
                                id={`edit-message-${message.id}`}
                                maxLength={2000}
                                onChange={(event) =>
                                  setEditDraft(event.currentTarget.value)
                                }
                                value={editDraft}
                              />
                              <button
                                aria-label="Enregistrer la modification"
                                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded border-0 bg-(--team-b-blue) text-white disabled:opacity-50"
                                disabled={busy || !editDraft.trim()}
                                type="submit"
                              >
                                <Check aria-hidden="true" size={15} />
                              </button>
                              <button
                                aria-label="Annuler la modification"
                                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded border border-(--line) bg-transparent text-(--text-secondary)"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditDraft("");
                                }}
                                type="button"
                              >
                                <X aria-hidden="true" size={15} />
                              </button>
                            </form>
                          ) : (
                            <p className="mb-0 mt-1 whitespace-pre-wrap wrap-break-word text-xs leading-relaxed text-(--ink)">
                              {message.body}
                            </p>
                          )}
                        </div>
                        {mine && (message.readers ?? []).length > 0 && (
                          <div
                            aria-label={`Lu par ${(message.readers ?? []).map((reader) => reader.display_name).join(", ")}`}
                            className="mt-1 flex max-w-[85%] items-center justify-end gap-1.5"
                            title={`Lu par ${(message.readers ?? []).map((reader) => reader.display_name).join(", ")}`}
                          >
                            <span className="inline-flex -space-x-1.5">
                              {(message.readers ?? [])
                                .slice(0, 4)
                                .map((reader) => (
                                  <span
                                    aria-label={reader.display_name}
                                    className="grid size-5 place-items-center rounded-full border-2 border-(--bg-main) bg-(--team-b-blue) text-[8px] font-bold text-white"
                                    key={reader.user_id}
                                    role="img"
                                    title={reader.display_name}
                                  >
                                    {reader.display_name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                ))}
                            </span>
                            {(message.readers ?? []).length > 4 && (
                              <span className="text-[9px] text-(--text-secondary)">
                                +{(message.readers ?? []).length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ol>
              {maySend ? (
                <form
                  className="fixed inset-x-0 bottom-0 z-30 flex items-end gap-2 border-t border-(--line) bg-(--bg-main) px-0 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-8px_24px_#0005] min-[701px]:static min-[701px]:shrink-0 min-[701px]:bg-transparent min-[701px]:p-3 min-[701px]:shadow-none"
                  onSubmit={(event) => void sendMessage(event)}
                >
                  <div className="mx-auto flex w-[min(calc(100%-56px),1440px)] items-end gap-2 max-[680px]:w-[calc(100%-32px)] max-[380px]:w-[calc(100%-24px)] min-[701px]:w-full">
                    <label className="sr-only" htmlFor="discussion-message">
                      Votre message
                    </label>
                    <textarea
                      className="min-h-11 min-w-0 flex-1 resize-none rounded-md border border-(--line) bg-(--bg-main) px-3 py-2 text-xs text-(--ink) outline-none focus:border-(--team-b-blue)"
                      id="discussion-message"
                      maxLength={2000}
                      onChange={(event) => setDraft(event.currentTarget.value)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Écrire un message…"
                      rows={1}
                      value={draft}
                    />
                    <button
                      aria-label="Envoyer le message"
                      className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-(--team-b-blue) text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy || !draft.trim()}
                      type="submit"
                    >
                      <Send aria-hidden="true" size={17} />
                    </button>
                  </div>
                </form>
              ) : (
                <p className="m-0 border-t border-(--line) px-4 py-3 text-xs text-(--text-secondary)">
                  {selectedMatch.status === "cancelled"
                    ? "Ce match est annulé : la discussion est en lecture seule."
                    : "La discussion nécessite un club synchronisé."}
                </p>
              )}
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-xs text-(--text-secondary)">
              Sélectionne une discussion ou ouvre-en une depuis une carte de
              match.
            </div>
          )}
        </div>
      </div>
      {(notice ||
        (!supabase || !organizationId
          ? "Les discussions nécessitent un club synchronisé."
          : "")) && (
        <p className="mt-3 text-xs text-(--text-secondary)" role="status">
          {notice || "Les discussions nécessitent un club synchronisé."}
        </p>
      )}
    </section>
  );
}
