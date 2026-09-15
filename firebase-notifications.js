// public/firebase-notifications.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjLxkisBi9pzmjlwdHnYfo25XR2Z6ToEs",
  authDomain: "opay-plus-5802c.firebaseapp.com",
  projectId: "opay-plus-5802c",
  storageBucket: "opay-plus-5802c.firebasestorage.app",
  messagingSenderId: "967061625774",
  appId: "1:967061625774:web:236f88391ccdd9edd2863f"
};

const VAPID_KEY = "BFT2QGMRtDQdMcor9Ddp8o-S5DxVlAc9MUou9UWNDxepIwh_q7pEHHK8CjH4UHe7wJRGwv5izgA0pigeHbBo-6Q";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Expose a global function your pages can call
window.enableNotifications = async function () {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    alert('Notifications blocked. Please enable them in browser settings.');
    return null;
  }
  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  console.log('FCM Token:', token);
  // TODO: save `token` to Firestore under the current user
  // await setDoc(doc(db, 'users', uid), { fcmToken: token }, { merge: true });
  return token;
};

// Foreground messages (page open) — show a browser notification anyway
onMessage(messaging, (payload) => {
  console.log('Foreground message:', payload);
  const title = payload.notification?.title || 'New message';
  const body = payload.notification?.body || '';
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/firebase-logo.png' });
  }
});
