/* api/send-notification.js — Vercel serverless function
 * Sends FCM push notifications using firebase-admin.
 * Accepts both { token: "..." } and { tokens: [...] } in the body.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// ─── Init firebase-admin once per cold start ────────────────────────────
if (!getApps().length) {
    try {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
        });
        console.log('✅ firebase-admin initialized');
    } catch (err) {
        console.error('❌ firebase-admin init failed:', err.message);
    }
}

export default async function handler(req, res) {
    // ─── CORS (safe even when same-origin) ──────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // ─── 1. Parse body ──────────────────────────────────────────────
        const {
            token,          // single string (legacy)
            tokens,         // array of strings (new)
            title,
            body,
            clickAction,
            link,
            icon,
            image,
            data
        } = req.body || {};

        // Normalize to array — accept both shapes
        let list = [];
        if (Array.isArray(tokens)) list = tokens.filter(Boolean);
        else if (typeof tokens === 'string') list = [tokens];
        else if (typeof token === 'string' && token) list = [token];

        if (list.length === 0) {
            return res.status(400).json({ error: 'No token(s) supplied. Send { token } or { tokens: [...] }.' });
        }

        // ─── 2. Build the message ───────────────────────────────────────
        const targetUrl = clickAction || link || '/message.html';
        const iconUrl = icon || '/images/dashboard/logo.png';
        const imageUrl = image || undefined;

        const baseMessage = {
            notification: {
                title: title || 'OPay Plus',
                body: body || ''
            },
            data: {
                clickAction: targetUrl,
                url: targetUrl,
                title: title || '',
                body: body || '',
                ...(data || {})
            },
            webpush: {
                notification: {
                    icon: iconUrl,
                    badge: iconUrl,
                    ...(imageUrl ? { image: imageUrl } : {})
                },
                fcmOptions: { link: targetUrl }
            }
        };

        // ─── 3. Send to all tokens in one call ──────────────────────────
        const messaging = getMessaging();
        const response = await messaging.sendEachForMulticast({
            tokens: list,
            ...baseMessage
        });

        // ─── 4. Report result ───────────────────────────────────────────
        return res.status(200).json({
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
            responses: response.responses.map((r, i) => ({
                token: list[i].slice(0, 12) + '...',
                success: r.success,
                error: r.error?.code || null,
                message: r.error?.message || null
            }))
        });

    } catch (err) {
        console.error('❌ send-notification error:', err);
        return res.status(500).json({
            success: false,
            error: err.message || 'Unknown server error',
            code: err.code || null
        });
    }
}
