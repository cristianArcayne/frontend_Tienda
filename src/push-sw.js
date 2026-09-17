self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || data.titulo || 'Nueva promocion';
  const options = {
    body: data.body || data.mensaje || data.descripcion || 'Hay una nueva oferta disponible.',
    icon: data.icon || '/assets/images/logos/logo-icon.svg',
    badge: data.badge || '/assets/images/logos/logo-icon.svg',
    data: {
      url: data.url || '/extra/catalogo',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/extra/catalogo';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin;
      const absoluteUrl = new URL(targetUrl, origin).href;

      for (const client of clientList) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }

      return undefined;
    })
  );
});
