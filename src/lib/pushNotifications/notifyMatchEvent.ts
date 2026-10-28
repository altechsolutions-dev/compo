import { supabase } from "../supabase/supabase";

export type MatchPushEvent =
  | "new_match"
  | "match_updated"
  | "spot_available"
  | "match_cancelled"
  | "match_finished";

export async function notifyMatchEvent(
  event: MatchPushEvent,
  matchId: string,
  previousCapacity?: number,
) {
  if (!supabase) return;

  try {
    const { data, error } = await supabase.functions.invoke("send-match-push", {
      body: {
        event,
        match_id: matchId,
        ...(previousCapacity === undefined
          ? {}
          : { previous_capacity: previousCapacity }),
      },
    });
    if (error) {
      console.warn("Notification push non envoyée :", error.message);
      return;
    }
    if (typeof data?.failed === "number" && data.failed > 0) {
      console.warn("Notifications push partiellement envoyées :", data);
    }
  } catch (error) {
    console.warn("Notification push non envoyée :", error);
  }
}
