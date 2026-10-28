export function formatMatchSchedule(matchDate: string, matchTime: string) {
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(matchDate);
  const timeParts = /^(\d{2}):(\d{2})/.exec(matchTime);
  if (!dateParts || !timeParts) {
    return `${matchDate} à ${matchTime}`;
  }

  const [, year, month, day] = dateParts;
  const date = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12),
  );
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
  const hour = String(Number(timeParts[1]));
  const minute = timeParts[2];

  return `${dateLabel} à ${hour} h ${minute}`;
}

export function formatMatchNotification(
  organizationName: string,
  matchDate: string,
  matchTime: string,
  venue: string,
) {
  return `${organizationName} · ${formatMatchSchedule(matchDate, matchTime)} · ${venue}`;
}
