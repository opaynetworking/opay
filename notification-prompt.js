/* ============================================================================
 * notification-prompt.js
 * ----------------------------------------------------------------------------
 * Drop-in notification prompt. Add this to any page with ONE line:
 *
 *     <script type="module" src="/notification-prompt.js"></script>
 *
 * What it does automatically:
 *   1. Waits for Firebase auth to be ready (uses the same config as your app).
 *   2. Registers the FCM service worker (/firebase-messaging-sw.js).
 *   3. If the user hasn't yet allowed notifications, shows a styled banner.
 *   4. When the user taps Allow, requests permission, gets an FCM token,
 *      and saves it to Firestore under users/{uid}.fcmTokens.
 *   5. On every future visit, if permission is already granted, silently
 *      refreshes the token so it never goes stale.
 *   6. On iOS, if the user isn't in a PWA, shows an "Add to Home Screen"
 *      instruction instead of the Allow button (iOS web-push requirement).
 *   7. Works in Android APK too — calls the native bridge if present.
 *
 * Options (optional — set on window BEFORE loading this script):
 *     window.NOTIF_PROMPT_OPTIONS = {
 *         autoPrompt: true,       // show banner on load (default true)
 *         delayMs: 1500,          // delay before showing banner
 *         apiBase: '',            // '' = same origin
 *         onTokenSaved: fn,       // callback(token)
 *         theme: 'light',         // 'light' | 'dark'
 *         text: { ... }           // override strings
 *     };
 * ==========================================================================*/

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getMessaging, getToken, isSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

/* ─────────────────────────── CONFIG ─────────────────────────── */
const firebaseConfig = {
    apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
    authDomain: "opay-plus-5802c.firebaseapp.com",
    projectId: "opay-plus-5802c",
    storageBucket: "opay-plus-5802c.firebasestorage.app",
    messagingSenderId: "967061625774",
    appId: "1:967061625774:web:236f88391ccdd9edd2863f",
    measurementId: "G-H0QV81VYBY"
};

const VAPID_KEY =
    "BO5pXZnpAjI44TwqMlARVszYtnUNLfdbewdicFiGidTt6q4rCX4PhnO6zA_cpU3Sj0eGsi8kLk6zy9I1w47gdNg";

const DEFAULTS = {
    autoPrompt: true,
    delayMs: 1500,
    apiBase: "",
    theme: "light",
    onTokenSaved: null,
    text: {
        title: "Stay Updated",
        message: "Allow notifications to get instant alerts for transfers, credits, and important updates.",
        allowBtn: "Allow Notifications",
        laterBtn: "Maybe Later",
        installedTitle: "Notifications Enabled",
        iosTitle: "Add to Home Screen",
        iosMessage: "On iPhone, tap Share → 'Add to Home Screen' to receive push notifications.",
        iosBtn: "Got It"
    }
};

const OPTS = Object.assign({}, DEFAULTS, window.NOTIF_PROMPT_OPTIONS || {});
OPTS.text = Object.assign({}, DEFAULTS.text, (window.NOTIF_PROMPT_OPTIONS || {}).text || {});

/* ─────────────────────────── ENVIRONMENT HELPERS ─────────────────────────── */
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isStandalonePWA() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.navigator.standalone === true) return true;
    return false;
}

function isRunningInAPK() {
    return !!(
        window.AndroidBridge ||
        window.Android ||
        window.ReactNativeWebView ||
        window.AndroidUpdater ||
        window.__opay_apk__ ||
        (navigator.userAgent && /; wv\)/.test(navigator.userAgent))
    );
}

/* ─────────────────────────── FIREBASE INIT ─────────────────────────── */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ─────────────────────────── STATE ─────────────────────────── */
let messaging = null;
let swRegistration = null;
let currentUser = null;
let bannerEl = null;
let tokenSaved = false;
let bannerShown = false;

/* ─────────────────────────── SERVICE WORKER ─────────────────────────── */
async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        const existing = await navigator.serviceWorker.getRegistration();
        swRegistration = existing || await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        return swRegistration;
    } catch (e) {
        console.warn('[notif-prompt] SW registration failed:', e);
        return null;
    }
}

async function ensureMessaging() {
    if (messaging) return messaging;
    try {
        if (await isSupported()) {
            messaging = getMessaging(app);
        }
    } catch (e) {
        console.warn('[notif-prompt] FCM not supported:', e);
    }
    return messaging;
}

/* ─────────────────────────── TOKEN ─────────────────────────── */
async function saveTokenToFirestore(token) {
    if (!currentUser || !token) return false;
    try {
        await setDoc(doc(db, 'users', currentUser.uid), {
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: Date.now()
        }, { merge: true });
        tokenSaved = true;
        if (typeof OPTS.onTokenSaved === 'function') {
            try { OPTS.onTokenSaved(token); } catch (e) {}
        }
        return true;
    } catch (e) {
        console.warn('[notif-prompt] Failed to save token:', e);
        return false;
    }
}

async function fetchAndSaveToken() {
    const m = await ensureMessaging();
    const sw = swRegistration || await ensureServiceWorker();
    if (!m) return null;
    try {
        const token = await getToken(m, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: sw || undefined
        });
        if (!token) {
            console.warn('[notif-prompt] No FCM token returned.');
            return null;
        }
        console.log('[notif-prompt] Token obtained:', token.slice(0, 20) + '...');
        await saveTokenToFirestore(token);

        // If in APK, hand the token to the native side too (optional)
        if (isRunningInAPK()) {
            try {
                if (window.AndroidBridge && typeof window.AndroidBridge.onWebFcmToken === 'function') {
                    window.AndroidBridge.onWebFcmToken(token);
                } else if (window.Android && typeof window.Android.onWebFcmToken === 'function') {
                    window.Android.onWebFcmToken(token);
                }
            } catch (e) {}
        }
        return token;
    } catch (e) {
        console.warn('[notif-prompt] getToken failed:', e);
        return null;
    }
}

/* ─────────────────────────── NATIVE APK NOTIFICATION ─────────────────────────── */
function triggerNativeNotification(title, body, extra = {}) {
    const payload = { type: 'SHOW_NOTIFICATION', title, body, ...extra };
    if (window.AndroidBridge) {
        try {
            if (typeof window.AndroidBridge.showNotification === 'function') { window.AndroidBridge.showNotification(title, body); return true; }
            if (typeof window.AndroidBridge.notify === 'function') { window.AndroidBridge.notify(title, body); return true; }
            if (typeof window.AndroidBridge.postMessage === 'function') { window.AndroidBridge.postMessage(JSON.stringify(payload)); return true; }
        } catch (e) {}
    }
    if (window.Android) {
        try {
            if (typeof window.Android.showNotification === 'function') { window.Android.showNotification(title, body); return true; }
            if (typeof window.Android.notify === 'function') { window.Android.notify(title, body); return true; }
            if (typeof window.Android.postMessage === 'function') { window.Android.postMessage(JSON.stringify(payload)); return true; }
        } catch (e) {}
    }
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        try { window.ReactNativeWebView.postMessage(JSON.stringify(payload)); return true; } catch (e) {}
    }
    return false;
}

/* ─────────────────────────── BANNER UI ─────────────────────────── */
function injectStyles() {
    if (document.getElementById('notifPromptStyles')) return;
    const style = document.createElement('style');
    style.id = 'notifPromptStyles';
    const dark = OPTS.theme === 'dark';
    style.textContent = `
        .notif-prompt-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(3px);
            -webkit-backdrop-filter: blur(3px);
            display: flex; align-items: center; justify-content: center;
            z-index: 999999; padding: 20px;
            animation: notifFadeIn 0.3s ease;
        }
        @keyframes notifFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .notif-prompt-card {
            background: ${dark ? '#1e1e1e' : '#ffffff'};
            color: ${dark ? '#e0e0e0' : '#1a1a1a'};
            width: 90%; max-width: 340px;
            border-radius: 24px;
            padding: 28px 24px 22px;
            text-align: center;
            box-shadow: 0 20px 50px -12px rgba(0,0,0,0.35);
            animation: notifPop 0.35s cubic-bezier(0.21, 1.11, 0.38, 1);
        }
        @keyframes notifPop {
            0% { opacity: 0; transform: scale(0.9) translateY(12px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        .notif-prompt-icon {
            width: 68px; height: 68px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #00bfa5, #00a28b);
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 8px 20px rgba(0,191,165,0.35);
            animation: notifBell 1.6s ease-in-out infinite;
        }
        .notif-prompt-icon svg {
            width: 34px; height: 34px; fill: #ffffff;
        }
        @keyframes notifBell {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
        }

        .notif-prompt-title {
            font-size: 19px; font-weight: 700;
            margin-bottom: 8px; letter-spacing: -0.2px;
            color: ${dark ? '#ffffff' : '#1a1a1a'};
        }
        .notif-prompt-message {
            font-size: 14px; line-height: 1.5;
            color: ${dark ? '#b8b8b8' : '#5a5a5a'};
            margin-bottom: 20px; font-weight: 500;
        }
        .notif-prompt-buttons {
            display: flex; flex-direction: column; gap: 10px;
        }
        .notif-prompt-btn {
            width: 100%;
            padding: 13px 0;
            border-radius: 60px;
            border: none;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            font-family: inherit;
            transition: transform 0.15s, background 0.2s, box-shadow 0.2s;
            -webkit-tap-highlight-color: transparent;
        }
        .notif-prompt-btn-allow {
            background: #00bfa5; color: #ffffff;
            box-shadow: 0 4px 14px rgba(0,191,165,0.4);
        }
        .notif-prompt-btn-allow:active {
            background: #00a28b;
            transform: scale(0.97);
        }
        .notif-prompt-btn-later {
            background: transparent;
            color: ${dark ? '#b8b8b8' : '#8a8a8a'};
            font-weight: 500;
            font-size: 14px;
            padding: 10px 0;
        }
        .notif-prompt-btn-later:active {
            color: ${dark ? '#ffffff' : '#1a1a1a'};
        }
    `;
    document.head.appendChild(style);
}

function buildBanner(mode) {
    // mode: 'prompt' | 'ios' | 'success'
    injectStyles();

    if (bannerEl) bannerEl.remove();
    bannerEl = document.createElement('div');
    bannerEl.className = 'notif-prompt-overlay';

    let title = OPTS.text.title;
    let message = OPTS.text.message;
    let primaryBtn = OPTS.text.allowBtn;
    let showLater = true;
    let primaryAction = 'request';

    if (mode === 'ios') {
        title = OPTS.text.iosTitle;
        message = OPTS.text.iosMessage;
        primaryBtn = OPTS.text.iosBtn;
        showLater = false;
        primaryAction = 'dismiss';
    } else if (mode === 'success') {
        title = OPTS.text.installedTitle;
        message = OPTS.text.message;
        primaryBtn = 'OK';
        showLater = false;
        primaryAction = 'dismiss';
    }

    bannerEl.innerHTML = `
        <div class="notif-prompt-card" role="dialog" aria-modal="true">
            <div class="notif-prompt-icon">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                </svg>
            </div>
            <div class="notif-prompt-title"></div>
            <div class="notif-prompt-message"></div>
            <div class="notif-prompt-buttons">
                <button class="notif-prompt-btn notif-prompt-btn-allow" type="button"></button>
                ${showLater ? '<button class="notif-prompt-btn notif-prompt-btn-later" type="button"></button>' : ''}
            </div>
        </div>
    `;

    // Safe text injection (avoid HTML injection)
    bannerEl.querySelector('.notif-prompt-title').textContent = title;
    bannerEl.querySelector('.notif-prompt-message').textContent = message;
    bannerEl.querySelector('.notif-prompt-btn-allow').textContent = primaryBtn;
    if (showLater) {
        bannerEl.querySelector('.notif-prompt-btn-later').textContent = OPTS.text.laterBtn;
    }

    // Wire up buttons
    bannerEl.querySelector('.notif-prompt-btn-allow').addEventListener('click', async () => {
        if (primaryAction === 'dismiss') {
            hideBanner();
            return;
        }
        await handleAllowClick();
    });

    const laterBtn = bannerEl.querySelector('.notif-prompt-btn-later');
    if (laterBtn) {
        laterBtn.addEventListener('click', () => {
            hideBanner();
            try { sessionStorage.setItem('notifPromptSnoozed', Date.now().toString()); } catch (e) {}
        });
    }

    // Allow backdrop click to dismiss if "later" is available
    bannerEl.addEventListener('click', (e) => {
        if (e.target === bannerEl && showLater) hideBanner();
    });

    document.body.appendChild(bannerEl);
    bannerShown = true;
    return bannerEl;
}

function hideBanner() {
    if (bannerEl) {
        bannerEl.style.opacity = '0';
        bannerEl.style.transition = 'opacity 0.2s';
        setTimeout(() => {
            if (bannerEl && bannerEl.parentNode) bannerEl.remove();
            bannerEl = null;
        }, 200);
    }
}

/* ─────────────────────────── PERMISSION FLOW ─────────────────────────── */
async function handleAllowClick() {
    if (!('Notification' in window)) {
        hideBanner();
        return;
    }

    // If already granted, just proceed
    if (Notification.permission === 'granted') {
        await ensureServiceWorker();
        await fetchAndSaveToken();
        buildBanner('success');
        setTimeout(hideBanner, 1800);
        return;
    }

    if (Notification.permission === 'denied') {
        // Can't ask again — show iOS-style instruction
        buildBanner('ios');
        return;
    }

    // Request permission
    try {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            await ensureServiceWorker();
            await fetchAndSaveToken();
            buildBanner('success');
            setTimeout(hideBanner, 1800);
        } else {
            hideBanner();
            try { sessionStorage.setItem('notifPromptSnoozed', Date.now().toString()); } catch (e) {}
        }
    } catch (e) {
        console.warn('[notif-prompt] requestPermission failed:', e);
        hideBanner();
    }
}

/* ─────────────────────────── AUTO-PROMPT ON LOAD ─────────────────────────── */
function shouldShowPrompt() {
    if (!OPTS.autoPrompt) return false;
    if (!('Notification' in window)) return false;

    // Don't prompt on iOS unless installed as PWA
    if (isIOS() && !isStandalonePWA()) {
        // Instead we'll offer "Add to Home Screen" guidance after a delay
        // but only once per session
        const snoozedAt = parseInt(sessionStorage.getItem('notifPromptSnoozed') || '0', 10);
        if (snoozedAt && Date.now() - snoozedAt < 1000 * 60 * 30) return false;
        return 'ios';
    }

    // If permission already granted → refresh silently, don't show banner
    if (Notification.permission === 'granted') return false;

    // If denied → don't nag
    if (Notification.permission === 'denied') return false;

    // Respect a 30-min snooze after "Maybe Later"
    const snoozedAt = parseInt(sessionStorage.getItem('notifPromptSnoozed') || '0', 10);
    if (snoozedAt && Date.now() - snoozedAt < 1000 * 60 * 30) return false;

    return 'prompt';
}

function scheduleAutoPrompt() {
    const mode = shouldShowPrompt();
    if (!mode) {
        // If already granted, silently refresh token
        if ('Notification' in window && Notification.permission === 'granted') {
            ensureServiceWorker().then(() => fetchAndSaveToken());
        }
        return;
    }

    setTimeout(() => {
        if (bannerShown) return;
        buildBanner(mode);
    }, OPTS.delayMs);
}

/* ─────────────────────────── AUTH WIRING ─────────────────────────── */
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    currentUser = user;

    // Ensure SW + messaging are ready
    ensureServiceWorker().then(() => ensureMessaging());

    // If already granted, silently refresh token once
    if ('Notification' in window && Notification.permission === 'granted') {
        fetchAndSaveToken();
    }

    // Schedule auto-prompt (once per page load / session)
    scheduleAutoPrompt();
});

// If no auth state change fires soon (e.g. user not signed in),
// still try to prompt after a short delay so guests can subscribe.
setTimeout(() => {
    if (!currentUser) scheduleAutoPrompt();
}, 2500);

/* ─────────────────────────── PUBLIC API ─────────────────────────── */
window.NotificationPrompt = {
    show: () => buildBanner('prompt'),
    hide: hideBanner,
    request: handleAllowClick,
    refreshToken: fetchAndSaveToken,
    registerNativeToken: async function (nativeToken) {
        if (!nativeToken) return false;
        if (!currentUser) return false;
        try {
            await setDoc(doc(db, 'users', currentUser.uid), {
                fcmTokens: arrayUnion(nativeToken),
                lastTokenUpdate: Date.now(),
                hasNativeToken: true
            }, { merge: true });
            console.log('[notif-prompt] Native token saved');
            return true;
        } catch (e) {
            console.warn('[notif-prompt] Native token save failed:', e);
            return false;
        }
    }
};

console.log('[notif-prompt] Ready.');
