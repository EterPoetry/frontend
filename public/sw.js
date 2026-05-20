self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

const buildNotificationUrl = (notification) => {
    if (!notification) {
        return '/';
    }

    const payload = notification.targetRoutePayload || {};
    const username = payload.username || notification.lastActor?.username;
    const postSlug = payload.postSlug || notification.postSlug;
    const commentId = payload.commentId ?? notification.commentId;

    if (notification.notificationType === 'user_followed' && username) {
        return `/@${username}`;
    }

    if (postSlug) {
        const base = `/posts/${postSlug}`;

        return commentId != null ? `${base}?focus=comments&focusToken=${Date.now()}#comments` : base;
    }

    if (username) {
        return `/@${username}`;
    }

    return '/';
};

self.addEventListener('push', (event) => {
    let data = {};

    if (event.data) {
        try {
            const parsed = event.data.json();

            if (parsed && typeof parsed === 'object') {
                data = parsed;
            } else {
                data = { webPush: { body: String(parsed) } };
            }
        } catch {
            data = { webPush: { body: event.data.text() } };
        }
    }

    const webPush = data.webPush || {};
    const title = webPush.title || 'Eter';
    const url = buildNotificationUrl(data.notification);

    const options = {
        body: webPush.body || '',
        icon: '/favicon-32.png',
        badge: '/favicon-32.png',
        tag: webPush.tag || 'eter-notification',
        renotify: webPush.renotify ?? false,
        data: { url },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const url = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
                    return client.navigate(url).then((c) => c?.focus());
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        }),
    );
});
