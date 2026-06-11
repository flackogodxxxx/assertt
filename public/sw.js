self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/crm";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((client) => new URL(client.url).pathname === targetUrl);
      if (existing) {
        return existing.focus();
      }
      return clients.openWindow(targetUrl);
    })
  );
});
