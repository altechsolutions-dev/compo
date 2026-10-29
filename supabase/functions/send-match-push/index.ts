import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { formatMatchNotification } from "./formatMatchSchedule.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PushEvent =
  | "new_match"
  | "match_updated"
  | "spot_available"
  | "match_cancelled"
  | "match_confirmed"
  | "match_finished"
  | "chat_message";

const messages: Record<
  PushEvent,
  (match: MatchRow) => { title: string; body: string }
> = {
  new_match: (match) => ({
    title: "Nouveau match",
    body: formatMatchNotification(
      match.organization?.name ?? "Votre club",
      match.match_date,
      match.match_time,
      match.venue,
    ),
  }),
  match_updated: (match) => ({
    title: "Match modifié",
    body: formatMatchNotification(
      match.organization?.name ?? "Votre club",
      match.match_date,
      match.match_time,
      match.venue,
    ),
  }),
  spot_available: (match) => ({
    title: "Une place est disponible",
    body: formatMatchNotification(
      match.organization?.name ?? "Votre club",
      match.match_date,
      match.match_time,
      match.venue,
    ),
  }),
  match_confirmed: (match) => ({
    title: "Match confirmé",
    body: `Le match est complet. Consultez la composition : ${formatMatchNotification(
      match.organization?.name ?? "Votre club",
      match.match_date,
      match.match_time,
      match.venue,
    )}.`,
  }),
  match_cancelled: (match) => ({
    title: "Match annulé",
    body: formatMatchNotification(
      match.organization?.name ?? "Votre club",
      match.match_date,
      match.match_time,
      match.venue,
    ),
  }),
  match_finished: () => ({
    title: "Match terminé",
    body: "Le résumé et le vote pour l’homme du match sont disponibles.",
  }),
  chat_message: (match) => ({
    title: "Nouveau message",
    body: `Un nouveau message dans la discussion du match à ${match.venue}.`,
  }),
};

type MatchRow = {
  id: string;
  organization_id: string;
  created_by: string;
  match_date: string;
  match_time: string;
  venue: string;
  max_players: number;
  status: string;
  match_slot_attendees: { user_id: string }[];
  organization: { name: string } | null;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT");
    if (
      !authorization ||
      !supabaseUrl ||
      !anonKey ||
      !serviceRoleKey ||
      !publicKey ||
      !privateKey ||
      !vapidSubject
    ) {
      return Response.json(
        { error: "Push service is not configured" },
        { status: 503, headers: corsHeaders },
      );
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401, headers: corsHeaders },
      );
    }

    const body = await request.json();
    const event = body.event as PushEvent;
    const matchId = body.match_id;
    const messageId = body.chat_message_id;
    if (
      !Object.prototype.hasOwnProperty.call(messages, event) ||
      typeof matchId !== "string" ||
      (event === "chat_message" && typeof messageId !== "string")
    ) {
      return Response.json(
        { error: "Invalid push event" },
        { status: 400, headers: corsHeaders },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: match, error: matchError } = await admin
      .from("match_slots")
      .select(
        "id, organization_id, created_by, match_date, match_time, venue, max_players, status, match_slot_attendees(user_id), organization:organizations(name)",
      )
      .eq("id", matchId)
      .single();
    if (matchError || !match) {
      return Response.json(
        { error: "Match not found" },
        { status: 404, headers: corsHeaders },
      );
    }
    const matchRow = match as MatchRow;
    const attendeeIds = matchRow.match_slot_attendees.map(
      (attendee) => attendee.user_id,
    );
    if (
      event === "match_confirmed" &&
      (matchRow.status !== "scheduled" ||
        attendeeIds.length < matchRow.max_players)
    ) {
      return Response.json(
        { error: "Match is not full and scheduled" },
        { status: 409, headers: corsHeaders },
      );
    }
    if (event === "chat_message") {
      const { data: chatMessage, error: chatMessageError } = await admin
        .from("match_discussion_messages")
        .select("id, match_slot_id, author_id")
        .eq("id", messageId)
        .eq("match_slot_id", matchId)
        .maybeSingle();
      if (
        chatMessageError ||
        !chatMessage ||
        chatMessage.author_id !== user.id
      ) {
        return Response.json(
          { error: "Message not found or sender is not its author" },
          { status: 403, headers: corsHeaders },
        );
      }
    }
    const isAuthorizedSender =
      event === "match_finished"
        ? attendeeIds.includes(user.id)
        : event === "chat_message"
          ? true
          : event === "match_confirmed"
            ? attendeeIds.includes(user.id) || matchRow.created_by === user.id
            : matchRow.created_by === user.id;
    if (!isAuthorizedSender) {
      return Response.json(
        { error: "Only an authorized match participant can send this alert" },
        { status: 403, headers: corsHeaders },
      );
    }
    const validStatus =
      event === "chat_message"
        ? matchRow.status !== "finished" && matchRow.status !== "cancelled"
        : event === "match_cancelled"
          ? matchRow.status === "cancelled"
          : event === "match_finished"
            ? matchRow.status === "finished"
            : matchRow.status === "scheduled";
    if (!validStatus) {
      return Response.json(
        { error: "Match state does not match this alert" },
        { status: 409, headers: corsHeaders },
      );
    }
    if (event === "spot_available") {
      const previousCapacity = Number(body.previous_capacity);
      if (
        !Number.isInteger(previousCapacity) ||
        previousCapacity >= matchRow.max_players ||
        matchRow.match_slot_attendees.length >= matchRow.max_players
      ) {
        return Response.json(
          { error: "No new place is available" },
          { status: 409, headers: corsHeaders },
        );
      }
    }

    const { data: organizationMembers, error: membersError } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", matchRow.organization_id);
    if (membersError) throw membersError;

    const memberIds = (organizationMembers ?? []).map(
      (member) => member.user_id as string,
    );
    if (!memberIds.includes(user.id)) {
      return Response.json(
        { error: "Organization membership required" },
        { status: 403, headers: corsHeaders },
      );
    }
    const recipients =
      event === "match_updated" ||
      event === "match_cancelled" ||
      event === "match_finished" ||
      event === "match_confirmed"
        ? attendeeIds
        : memberIds;
    const recipientIds = [
      ...new Set(recipients.filter((id) => id !== user.id)),
    ];
    if (recipientIds.length === 0) {
      return Response.json({ sent: 0 }, { headers: corsHeaders });
    }

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", recipientIds);
    if (subscriptionsError) throw subscriptionsError;
    let subscriptionsToSend = subscriptions ?? [];
    if (event === "match_confirmed" && subscriptions?.length) {
      const claimRows = subscriptions.map((subscription) => ({
        match_id: matchRow.id,
        endpoint: subscription.endpoint,
      }));
      const { data: claimedRows, error: claimError } = await admin
        .from("match_confirmation_push_claims")
        .upsert(claimRows, {
          onConflict: "match_id,endpoint",
          ignoreDuplicates: true,
        })
        .select("endpoint");
      if (claimError) throw claimError;
      const claimedEndpoints = new Set(
        (claimedRows ?? []).map((claim) => claim.endpoint),
      );
      subscriptionsToSend = subscriptions.filter((subscription) =>
        claimedEndpoints.has(subscription.endpoint),
      );
      if (subscriptionsToSend.length === 0) {
        return Response.json(
          { sent: 0, failed: 0, duplicate: true },
          { headers: corsHeaders },
        );
      }
    }
    if (event === "chat_message") {
      const claimRows = subscriptionsToSend.map((subscription) => ({
        message_id: messageId,
        endpoint: subscription.endpoint,
      }));
      const { data: claimedRows, error: claimError } = await admin
        .from("match_chat_push_claims")
        .upsert(claimRows, {
          onConflict: "message_id,endpoint",
          ignoreDuplicates: true,
        })
        .select("endpoint");
      if (claimError) throw claimError;
      const claimedEndpoints = new Set(
        (claimedRows ?? []).map((claim) => claim.endpoint),
      );
      subscriptionsToSend = subscriptionsToSend.filter((subscription) =>
        claimedEndpoints.has(subscription.endpoint),
      );
      if (subscriptionsToSend.length === 0) {
        return Response.json(
          { sent: 0, failed: 0, duplicate: true },
          { headers: corsHeaders },
        );
      }
    }
    if (event === "match_finished" && subscriptions?.length) {
      const claimRows = subscriptionsToSend.map((subscription) => ({
        match_id: matchRow.id,
        endpoint: subscription.endpoint,
      }));
      const { data: claimedRows, error: claimError } = await admin
        .from("match_finish_push_claims")
        .upsert(claimRows, {
          onConflict: "match_id,endpoint",
          ignoreDuplicates: true,
        })
        .select("endpoint");
      if (claimError) throw claimError;
      const claimedEndpoints = new Set(
        (claimedRows ?? []).map((claim) => claim.endpoint),
      );
      subscriptionsToSend = subscriptionsToSend.filter((subscription) =>
        claimedEndpoints.has(subscription.endpoint),
      );
      if (subscriptionsToSend.length === 0) {
        return Response.json(
          { sent: 0, failed: 0, duplicate: true },
          { headers: corsHeaders },
        );
      }
    }

    webpush.setVapidDetails(vapidSubject, publicKey, privateKey);
    const message = messages[event](matchRow);
    const results = await Promise.allSettled(
      subscriptionsToSend.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            JSON.stringify({
              ...message,
              url:
                event === "chat_message"
                  ? `/app/discussions?match=${encodeURIComponent(matchRow.id)}`
                  : event === "match_confirmed"
                    ? `/app/matches?match=${encodeURIComponent(matchRow.id)}`
                    : event === "match_finished"
                      ? `/app/matches?match=${encodeURIComponent(matchRow.id)}`
                      : "/app/matches",
            }),
          );
        } catch (error) {
          if (
            error instanceof Error &&
            "statusCode" in error &&
            [404, 410].includes(Number(error.statusCode))
          ) {
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", subscription.endpoint);
            return;
          }
          throw error;
        }
      }),
    );

    const failed = results.filter(
      (result) => result.status === "rejected",
    ).length;
    if (failed > 0) {
      const failedEndpoints = subscriptionsToSend
        .filter((_, index) => results[index].status === "rejected")
        .map((subscription) => subscription.endpoint);
      const claimTable =
        event === "chat_message"
          ? "match_chat_push_claims"
          : event === "match_finished"
            ? "match_finish_push_claims"
            : event === "match_confirmed"
              ? "match_confirmation_push_claims"
              : null;
      const claimKey =
        event === "chat_message"
          ? "message_id"
          : claimTable === null
            ? null
            : "match_id";
      if (claimTable && claimKey) {
        const { error: cleanupError } = await admin
          .from(claimTable)
          .delete()
          .eq(claimKey, event === "chat_message" ? messageId : matchRow.id)
          .in("endpoint", failedEndpoints);
        if (cleanupError) throw cleanupError;
      }
    }
    return Response.json(
      { sent: subscriptionsToSend.length - failed, failed },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("send-match-push failed", error);
    return Response.json(
      { error: "Unable to send push notifications" },
      { status: 500, headers: corsHeaders },
    );
  }
});
