import { supabase } from "../supabase/supabase";

export type MatchPushEvent =
  | "new_match"
  | "match_updated"
  | "spot_available"
  | "match_cancelled";

export async function notifyMatchEvent(
  event: MatchPushEvent,
  matchId: string,
  previousCapacity?: number,
) {
  if (!supabase) return;

  try {
    const { error } = await supabase.functions.invoke("send-match-push", {
      body: {
        event,
        match_id: matchId,
        ...(previousCapacity === undefined
          ? {}
          : { previous_capacity: previousCapacity }),
      },
    });
    if (error) console.warn("Notification push non envoyée :", error.message);
  } catch (error) {
    console.warn("Notification push non envoyée :", error);
  }
}
