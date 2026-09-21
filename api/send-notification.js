/* api/send-notification.js — Vercel serverless function (data-only FCM) */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
    try {
        initializeApp({
            credential: cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
            }),
        });
    } catch (err) {
        console.error('❌ firebase-admin init failed:', err.message);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const {
            token,
            tokens,
            title,
            body,
            clickAction,
            link,
            icon,
            image,
            data
        } = req.body || {};

        let list = [];
        if (Array.isArray(tokens)) list = tokens.filter(Boolean);
        else if (typeof tokens === 'string') list = [tokens];
        else if (typeof token === 'string' && token) list = [token];

        if (list.length === 0) {
            return res.status(400).json({ error: 'No token(s) supplied.' });
        }

        const targetUrl = clickAction || link || '/message.html';
        const iconUrl = icon || '/images/dashboard/logo.png';
        const imageUrl = image || '';

        const messaging = getMessaging();

        // ═══════════════════════════════════════════════════════════════
        //  DATA-ONLY payload — no `notification` field.
        //  This means ONLY the service worker controls how the
        //  notification looks. Chrome won't auto-display it,
        //  so no "from <origin>" attribution overlay gets added.
        // ═══════════════════════════════════════════════════════════════
        const message = {
            data: {
                title: String(title || 'Incoming Transfer Successfully'),
                body: String(body || ''),
                clickAction: String(targetUrl),
                icon: String(iconUrl),
                image: String(imageUrl),
                ...Object.fromEntries(
                    Object.entries(data || {}).map(([k, v]) => [k, String(v)])
                )
            },
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                fcmOptions: {
                    link: targetUrl
                }
            }
        };

        const response = await messaging.sendEachForMulticast({
            tokens: list,
            ...message
        });

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
