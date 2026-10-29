import { supabase } from "../supabase/supabase";

export type MatchPushEvent =
  | "new_match"
  | "match_updated"
  | "spot_available"
  | "match_cancelled"
  | "match_confirmed"
  | "match_finished"
  | "chat_message";

export async function notifyMatchEvent(
  event: MatchPushEvent,
  matchId: string,
  previousCapacity?: number,
  messageId?: string,
) {
  if (!supabase) return;

  const body = {
    event,
    match_id: matchId,
    ...(previousCapacity === undefined
      ? {}
      : { previous_capacity: previousCapacity }),
    ...(messageId === undefined ? {} : { chat_message_id: messageId }),
  };
  const supportsRetry =
    event === "chat_message" ||
    event === "match_confirmed" ||
    event === "match_finished";

  try {
    let remainingFailures = 0;
    for (let attempt = 0; attempt < (supportsRetry ? 2 : 1); attempt += 1) {
      const { data, error } = await supabase.functions.invoke(
        "send-match-push",
        {
          body,
        },
      );
      if (error) {
        console.warn(
          attempt === 0
            ? "Notification push non envoyée :"
            : "Nouvel essai de notification non envoyé :",
          error.message,
        );
        return;
      }
      remainingFailures = typeof data?.failed === "number" ? data.failed : 0;
      if (remainingFailures === 0 || !supportsRetry) break;
      if (attempt === 1) {
        console.warn("Notifications push partiellement envoyées :", data);
      }
    }
  } catch (error) {
    console.warn("Notification push non envoyée :", error);
  }
}
