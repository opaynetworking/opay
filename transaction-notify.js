/* ============================================================================
 * transaction-notify.js
 * ----------------------------------------------------------------------------
 * Reusable helper: send a push notification to the current user (all their
 * registered devices) after a transaction, message, or any event.
 *
 * Usage from any page:
 *   import { notifyTransaction } from '/transaction-notify.js';
 *
 *   await notifyTransaction({
 *     title: 'Transaction Successful',
 *     body: 'You sent ₦5,000 to John Doe.',
 *     clickAction: '/message.html'
 *   });
 * ==========================================================================*/

import { getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Resolve the API base — works from any host (same-origin preferred)
function getApiBase() {
  // If you later move admin to a different domain, change this:
  // return 'https://opayplus.vercel.app';
  return window.location.origin;
}

/**
 * Send a push notification to the current signed-in user's devices.
 *
 * @param {Object}  opts
 * @param {string}  opts.title        Notification title
 * @param {string}  opts.body         Notification body
 * @param {string} [opts.clickAction] URL opened when the user taps (default /message.html)
 * @param {string} [opts.icon]        Icon URL
 * @param {string} [opts.image]       Large image URL (optional)
 * @param {Object} [opts.data]        Extra key/value pairs sent with the push
 * @returns {Promise<Object>}         { success, sent, failed, responses } or { success:false, error }
 */
export async function notifyTransaction(opts = {}) {
  const {
    title = 'OPay Plus',
      body = '',
      clickAction = '/message.html',
      icon = '/images/dashboard/logo.png',
      image = '',
      data = {}
  } = opts;
  
  try {
    // 1. Get the signed-in user
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.warn('[transaction-notify] No signed-in user — skipping push.');
      return { success: false, error: 'No signed-in user' };
    }
    
    // 2. Read their FCM tokens from Firestore
    const db = getFirestore();
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) {
      console.warn('[transaction-notify] User doc missing.');
      return { success: false, error: 'User doc missing' };
    }
    const tokens = Array.isArray(snap.data().fcmTokens) ? snap.data().fcmTokens.filter(Boolean) : [];
    if (tokens.length === 0) {
      console.warn('[transaction-notify] No FCM tokens — user has not enabled notifications.');
      return { success: false, error: 'No FCM tokens' };
    }
    
    // 3. Send via your Vercel API (firebase-admin)
    const res = await fetch(`${getApiBase()}/api/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokens,
        title,
        body,
        clickAction,
        icon,
        image,
        data
      })
    });
    
    const result = await res.json();
    if (!res.ok || !result.success) {
      console.warn('[transaction-notify] API error:', result);
    }
    return result;
    
  } catch (err) {
    console.error('[transaction-notify] Failed:', err);
    return { success: false, error: err.message || String(err) };
  }
}