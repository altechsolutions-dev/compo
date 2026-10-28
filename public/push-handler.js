self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Compo", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Compo", {
      body:
        payload.body || "Une information concernant votre club est disponible.",
      icon: "/compo-icon-192.png",
      badge: "/compo-icon-192.png",
      data: { url: payload.url || "/app/matches" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(
    event.notification.data?.url || "/app/matches",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing) {
          existing.navigate(targetUrl);
          return existing.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
