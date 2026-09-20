/* ============================================================================
 * firebase-messaging-sw.js
 * ----------------------------------------------------------------------------
 * Place this file at the ROOT of your website (same level as index.html).
 *
 * This Service Worker handles:
 *   1. Firebase Cloud Messaging (FCM) push notifications sent from the admin
 *      panel (adminprocess.html / adminautoupgrade.html) — works even when the
 *      browser tab is closed.
 *   2. Local Service Worker notifications triggered by the in-page code in
 *      "message new (noficaton).html" via `swReg.showNotification(...)`.
 *
 * It is shared by both the admin side and the user side, so any change to
 * notification behaviour should be made here only.
 * ==========================================================================*/

/* ─── Firebase SDK (compat build – required for Service Workers) ────────── */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

/* ─── Firebase config (must match the one used in your web pages) ───────── */
firebase.initializeApp({
    apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
    authDomain: "opay-plus-5802c.firebaseapp.com",
    projectId: "opay-plus-5802c",
    storageBucket: "opay-plus-5802c.firebasestorage.app",
    messagingSenderId: "967061625774",
    appId: "1:967061625774:web:236f88391ccdd9edd2863f"
});

const messaging = firebase.messaging();

/* ─── Paths (change here if you rename files) ───────────────────────────── */
const DEFAULT_ICON   = '/images/dashboard/logo.png';
const FALLBACK_ICON  = '/favicon.ico';
const DEFAULT_TARGET = '/message new (noficaton).html'; // ← recommended to rename to /notifications.html

/* ============================================================================
 * LIFECYCLE EVENTS
 * ==========================================================================*/
self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

/* ============================================================================
 * FCM BACKGROUND PUSH
 * ----------------------------------------------------------------------------
 * Fires when a push is received while the page is closed or in the background.
 * ==========================================================================*/
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background push received:', payload);

    const notif = payload.notification || {};
    const data  = payload.data || {};

    const title =
        notif.title ||
        data.title ||
        'New notification from Opay Plus';

    const bodyText =
        notif.body ||
        data.body ||
        '';

    const iconUrl =
        notif.icon ||
        data.icon ||
        DEFAULT_ICON;

    const imageUrl =
        notif.image ||
        data.image ||
        undefined;

    // Resolve the click target. Encode it so paths with spaces work.
    const rawClickAction =
        data.clickAction ||
        notif.click_action ||
        DEFAULT_TARGET;

    const clickAction = encodeURI(rawClickAction);

    const options = {
        body: bodyText,
        icon: iconUrl,
        badge: DEFAULT_ICON,
        image: imageUrl,
        tag: 'opay-push-' + (data.messageId || Date.now()),
        renotify: false,
        silent: false,
        requireInteraction: false,
        data: {
            clickAction: clickAction,
            url: clickAction,
            messageId: data.messageId || null,
            timestamp: Date.now()
        }
    };

    return self.registration.showNotification(title, options);
});

/* ============================================================================
 * NOTIFICATION CLICK
 * ==========================================================================*/
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data || {};
    const rawTarget =
        notifData.clickAction ||
        notifData.url ||
        DEFAULT_TARGET;

    // Always encode the final target — safe if it was already encoded too.
    const targetUrl = encodeURI(decodeURI(rawTarget));

    console.log('[firebase-messaging-sw.js] Notification clicked →', targetUrl);

    event.waitUntil(
        clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
            for (const client of clientList) {
                try {
                    if (
                        client.url &&
                        client.url.includes(self.location.origin) &&
                        'focus' in client
                    ) {
                        if ('navigate' in client) {
                            client.navigate(targetUrl);
                        }
                        return client.focus();
                    }
                } catch (err) {
                    console.warn('[firebase-messaging-sw.js] Client focus failed:', err);
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

/* ============================================================================
 * OPTIONAL: Handle notifications closed by the user
 * ==========================================================================*/
self.addEventListener('notificationclose', (event) => {
    console.log('[firebase-messaging-sw.js] Notification closed:', event.notification.tag);
});

/* ============================================================================
 * OPTIONAL: Service Worker error handling
 * ==========================================================================*/
self.addEventListener('error', (event) => {
    console.error('[firebase-messaging-sw.js] Uncaught error:', event.error || event.message);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[firebase-messaging-sw.js] Unhandled promise rejection:', event.reason);
});

/* ============================================================================
 * END OF FILE
 * ==========================================================================*/
