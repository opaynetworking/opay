/* ============================================================================
 * app-update-check.js
 * ----------------------------------------------------------------------------
 * Aggressive APK version checker with install instructions, snooze,
 * and WhatsApp channel fallback for downloading the update.
 *
 *   • Any Android device WITHOUT the AndroidUpdater bridge → old APK
 *     → shows forced "Update Required" modal
 *   • Any Android device WITH the AndroidUpdater bridge → compares versions
 *   • "Update Now" → shows install instructions modal
 *   • "Continue to Download" → opens the APK URL
 *   • "Visit WhatsApp Channel" → opens your WhatsApp channel to get the APK
 *   • "Maybe Later" (on instructions modal) → snoozes for 3 hours
 *
 * Install: add this to any page:
 *     <script src="/app-update-check.js"></script>
 * ==========================================================================*/

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
     *  CONFIG
     * ═══════════════════════════════════════════════════════════════ */
    var WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029VbCdPU17j6g0m69aTE1h';

    var OPTS = Object.assign({
        versionJsonUrl: '/version.json',
        theme: 'light',
        requireWebViewMarker: false,          // aggressive mode (default)
        snoozeMs: 3 * 60 * 60 * 1000,         // 3 hours
        whatsappUrl: WHATSAPP_CHANNEL_URL
    }, window.APP_UPDATE_OPTIONS || {});

    var SNOOZE_KEY = 'opayUpdateSnoozedUntil';

    /* ═══════════════════════════════════════════════════════════════
     *  ENVIRONMENT DETECTION
     * ═══════════════════════════════════════════════════════════════ */
    function isAndroid() {
        return /android/i.test(navigator.userAgent);
    }

    function hasWvMarker() {
        var ua = navigator.userAgent;
        if (/;\s*wv[)\s]/i.test(ua)) return true;
        if (ua.indexOf(' wv') !== -1) return true;
        if (/Version\/4\.0.*Chrome/i.test(ua) && /Mobile/i.test(ua)) return true;
        return false;
    }

    function isInWebViewAPK() {
        if (!isAndroid()) return false;
        if (hasWvMarker()) return true;
        if (OPTS.requireWebViewMarker === false) {
            var ua = navigator.userAgent.toLowerCase();
            if (ua.indexOf('version/4.0') !== -1) return true;

            var isRealBrowser =
                (ua.indexOf('chrome/') !== -1 && ua.indexOf('version/4.0') === -1) ||
                ua.indexOf('firefox/') !== -1 ||
                ua.indexOf('samsungbrowser') !== -1 ||
                ua.indexOf('edg') !== -1 ||
                ua.indexOf('opera') !== -1 ||
                ua.indexOf('brave') !== -1;

            return !isRealBrowser;
        }
        return false;
    }

    function hasNewBridge() {
        return !!(window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersion === 'function');
    }

    function getInstalledVersion() {
        try {
            if (hasNewBridge()) {
                var v = window.AndroidUpdater.getAppVersion();
                var n = parseInt(v, 10);
                return isNaN(n) ? 0 : n;
            }
        } catch (e) {}
        return 0;
    }

    function getInstalledVersionName() {
        try {
            if (window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersionName === 'function') {
                var n = window.AndroidUpdater.getAppVersionName();
                if (n) return String(n);
            }
        } catch (e) {}
        return '';
    }

    /* ═══════════════════════════════════════════════════════════════
     *  SNOOZE
     * ═══════════════════════════════════════════════════════════════ */
    function isSnoozed() {
        try {
            var until = parseInt(sessionStorage.getItem(SNOOZE_KEY) || '0', 10);
            return until > Date.now();
        } catch (e) { return false; }
    }

    function snooze() {
        try {
            sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + OPTS.snoozeMs));
        } catch (e) {}
    }

    /* ═══════════════════════════════════════════════════════════════
     *  OPEN EXTERNAL URL
     *  Uses location.href first so the APK's shouldOverrideUrlLoading
     *  (which handles WhatsApp links) can intercept it.
     * ═══════════════════════════════════════════════════════════════ */
    function openExternal(url) {
        if (!url) return;
        try {
            // Preferred — the APK's native URL handler intercepts this
            window.location.href = url;
        } catch (e) {
            // Fallback — open in new tab
            try { window.open(url, '_blank'); } catch (e2) {
                try { window.location.assign(url); } catch (e3) {}
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════════
     *  STYLES
     * ═══════════════════════════════════════════════════════════════ */
    function injectStyles() {
        if (document.getElementById('appUpdateStyles')) return;
        var dark = OPTS.theme === 'dark';
        var cardBg    = dark ? '#1e1e1e' : '#ffffff';
        var cardText  = dark ? '#e0e0e0' : '#1a1a1a';
        var titleText = dark ? '#ffffff' : '#1a1a1a';
        var bodyText  = dark ? '#b8b8b8' : '#5a5a5a';
        var chipBg    = dark ? '#2d2d2d' : '#f5f5f5';
        var chipText  = dark ? '#888888' : '#999999';
        var noteText  = dark ? '#777777' : '#a0a0a0';
        var laterText = dark ? '#b8b8b8' : '#8a8a8a';
        var laterActive = dark ? '#ffffff' : '#1a1a1a';

        var style = document.createElement('style');
        style.id = 'appUpdateStyles';
        style.textContent =
            '.app-update-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;opacity:0;transition:opacity 0.25s ease;-webkit-tap-highlight-color:transparent;overflow-y:auto;}' +
            '.app-update-overlay.show{opacity:1;}' +
            '.app-update-card{background:' + cardBg + ';color:' + cardText + ';width:90%;max-width:380px;border-radius:28px;padding:30px 24px 22px;text-align:center;box-shadow:0 25px 60px -12px rgba(0,0,0,0.5);transform:scale(0.92) translateY(12px);transition:transform 0.35s cubic-bezier(0.21,1.11,0.38,1);margin:auto;}' +
            '.app-update-overlay.show .app-update-card{transform:scale(1) translateY(0);}' +
            '.app-update-icon{width:70px;height:70px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(135deg,#00bfa5,#00a28b);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,191,165,0.35);animation:appUpdatePulse 1.6s ease-in-out infinite;}' +
            '@keyframes appUpdatePulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}' +
            '.app-update-icon svg{width:34px;height:34px;fill:#ffffff;}' +
            '.app-update-title{font-size:20px;font-weight:700;margin-bottom:8px;letter-spacing:-0.2px;color:' + titleText + ';}' +
            '.app-update-message{font-size:14px;line-height:1.5;color:' + bodyText + ';margin-bottom:22px;font-weight:500;}' +
            '.app-update-versions{display:flex;justify-content:center;gap:10px;font-size:12px;margin-bottom:22px;flex-wrap:wrap;color:' + chipText + ';}' +
            '.app-update-versions span{background:' + chipBg + ';padding:5px 12px;border-radius:20px;font-weight:600;}' +
            '.app-update-versions span b{color:#00bfa5;font-weight:700;}' +
            '.app-update-buttons{display:flex;flex-direction:column;gap:10px;}' +
            '.app-update-btn{width:100%;padding:15px 0;border-radius:60px;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform 0.15s,background 0.2s,box-shadow 0.2s;-webkit-tap-highlight-color:transparent;display:flex;align-items:center;justify-content:center;gap:10px;}' +
            '.app-update-btn-upgrade{background:#00bfa5;color:#ffffff;box-shadow:0 4px 14px rgba(0,191,165,0.4);}' +
            '.app-update-btn-upgrade:active{background:#00a28b;transform:scale(0.97);}' +
            '.app-update-btn-whatsapp{background:#25D366;color:#ffffff;box-shadow:0 4px 14px rgba(37,211,102,0.4);}' +
            '.app-update-btn-whatsapp:active{background:#1da851;transform:scale(0.97);}' +
            '.app-update-btn-whatsapp svg{width:20px;height:20px;fill:#ffffff;}' +
            '.app-update-btn-later{background:transparent;color:' + laterText + ';font-weight:500;font-size:14px;padding:10px 0;}' +
            '.app-update-btn-later:active{color:' + laterActive + ';}' +
            '.app-update-note{font-size:11px;margin-top:14px;color:' + noteText + ';}' +
            '.app-update-steps{text-align:left;font-size:13px;line-height:1.7;margin:0 0 18px 0;color:' + bodyText + ';background:' + chipBg + ';padding:14px 16px;border-radius:14px;}' +
            '.app-update-steps .step{margin-bottom:10px;display:flex;gap:10px;align-items:flex-start;}' +
            '.app-update-steps .step:last-child{margin-bottom:0;}' +
            '.app-update-steps .num{flex-shrink:0;font-weight:800;color:#00bfa5;min-width:18px;}' +
            '.app-update-steps b{color:' + titleText + ';font-weight:700;}' +
            '.app-update-divider{display:flex;align-items:center;gap:10px;margin:8px 0;color:' + chipText + ';font-size:11px;text-transform:uppercase;letter-spacing:1px;}' +
            '.app-update-divider::before,.app-update-divider::after{content:"";flex:1;height:1px;background:' + chipBg + ';}';
        document.head.appendChild(style);
    }

    /* ═══════════════════════════════════════════════════════════════
     *  WHATSAPP SVG ICON
     * ═══════════════════════════════════════════════════════════════ */
    var WHATSAPP_SVG =
        '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>' +
        '</svg>';

    /* ═══════════════════════════════════════════════════════════════
     *  MODAL 1 — FORCED UPDATE
     * ═══════════════════════════════════════════════════════════════ */
    function showUpdateModal(info, installedVer, installedName) {
        injectStyles();

        var existing = document.getElementById('appUpdateOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'appUpdateOverlay';
        overlay.className = 'app-update-overlay';

        var latestVer  = parseInt(info.versionCode, 10) || 0;
        var latestName = info.versionName || '';

        var customMessage = (info.message || '').trim();
        var defaultMessage = 'A new version of OPay Plus is available. Please update to continue using the app.';
        var messageText = customMessage || defaultMessage;

        var installedLabel = installedVer > 0
            ? 'v' + installedVer + (installedName ? ' (' + installedName + ')' : '')
            : 'Old version';

        var latestLabel = 'v' + latestVer + (latestName ? ' (' + latestName + ')' : '');

        overlay.innerHTML =
            '<div class="app-update-card" role="dialog" aria-modal="true">' +
                '<div class="app-update-icon">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="app-update-title">Update Required</div>' +
                '<div class="app-update-message"></div>' +
                '<div class="app-update-versions">' +
                    '<span>Installed: <b>' + installedLabel + '</b></span>' +
                    '<span>Latest: <b>' + latestLabel + '</b></span>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateNowBtn">Update Now</button>' +
                    '<button class="app-update-btn app-update-btn-whatsapp" type="button" id="appUpdateWhatsAppBtn">' +
                        WHATSAPP_SVG +
                        '<span>Visit WhatsApp Channel</span>' +
                    '</button>' +
                '</div>' +
                '<div class="app-update-note">This update is required to continue using the app.</div>' +
            '</div>';

        overlay.querySelector('.app-update-message').textContent = messageText;

        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            overlay.classList.add('show');
        });

        // Block ESC
        function blockEscape(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
        }
        document.addEventListener('keydown', blockEscape, true);

        // Prevent backdrop taps from closing
        overlay.addEventListener('click', function (e) { e.stopPropagation(); });

        // ── Update Now ──
        var nowBtn = overlay.querySelector('#appUpdateNowBtn');
        if (nowBtn) {
            nowBtn.addEventListener('click', function () {
                var apkUrl = (info.apkUrl || '').trim();
                if (!apkUrl) { console.warn('[app-update] No apkUrl.'); return; }

                // New APK (v9+) — use native installer
                if (window.AndroidUpdater && typeof window.AndroidUpdater.installUpdate === 'function') {
                    try {
                        window.AndroidUpdater.installUpdate(apkUrl);
                        return;
                    } catch (e) {}
                }

                // Old APK (v8) — show install instructions
                showInstallInstructions(apkUrl, overlay);
            });
        }

        // ── Visit WhatsApp Channel ──
        var waBtn = overlay.querySelector('#appUpdateWhatsAppBtn');
        if (waBtn) {
            waBtn.addEventListener('click', function () {
                console.log('[app-update] Opening WhatsApp channel:', OPTS.whatsappUrl);
                openExternal(OPTS.whatsappUrl);
            });
        }
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MODAL 2 — INSTALL INSTRUCTIONS (with WhatsApp + Maybe Later)
     * ═══════════════════════════════════════════════════════════════ */
    function showInstallInstructions(apkUrl, previousOverlay) {
        // Hide the first modal
        if (previousOverlay) {
            previousOverlay.classList.remove('show');
            setTimeout(function () {
                if (previousOverlay.parentNode) previousOverlay.parentNode.removeChild(previousOverlay);
            }, 250);
        }

        injectStyles();

        var existing = document.getElementById('appUpdateInstructions');
        if (existing) existing.remove();

        var instructions = document.createElement('div');
        instructions.id = 'appUpdateInstructions';
        instructions.className = 'app-update-overlay';

        instructions.innerHTML =
            '<div class="app-update-card" role="dialog" aria-modal="true">' +
                '<div class="app-update-icon">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="app-update-title">Finish the Update</div>' +
                '<div class="app-update-steps">' +
                    '<div class="step">' +
                        '<span class="num">1.</span>' +
                        '<span>Tap <b>Continue to Download</b> below.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">2.</span>' +
                        '<span>When Android says <b>"Blocked"</b> or <b>"Install unknown apps"</b>, tap <b>Settings</b>.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">3.</span>' +
                        '<span>Turn ON <b>"Allow from this source"</b>.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">4.</span>' +
                        '<span>Go back and tap <b>Install</b> again.</span>' +
                    '</div>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateContinueBtn">Continue to Download</button>' +
                    '<button class="app-update-btn app-update-btn-whatsapp" type="button" id="appUpdateWhatsAppBtn2">' +
                        WHATSAPP_SVG +
                        '<span>Visit WhatsApp Channel</span>' +
                    '</button>' +
                    '<button class="app-update-btn app-update-btn-later" type="button" id="appUpdateLaterBtn">Maybe Later</button>' +
                '</div>' +
                '<div class="app-update-note">This is a one-time setup. Future updates install automatically.</div>' +
            '</div>';

        document.body.appendChild(instructions);

        requestAnimationFrame(function () {
            instructions.classList.add('show');
        });

        function closeInstructions() {
            instructions.classList.remove('show');
            setTimeout(function () {
                if (instructions.parentNode) instructions.parentNode.removeChild(instructions);
            }, 250);
        }

        // ── Continue to Download ──
        var continueBtn = instructions.querySelector('#appUpdateContinueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', function () {
                try {
                    var opened = window.open(apkUrl, '_blank');
                    if (!opened) {
                        window.location.href = apkUrl;
                    }
                } catch (e) {
                    try { window.location.href = apkUrl; } catch (e2) {}
                }
            });
        }

        // ── Visit WhatsApp Channel ──
        var waBtn2 = instructions.querySelector('#appUpdateWhatsAppBtn2');
        if (waBtn2) {
            waBtn2.addEventListener('click', function () {
                console.log('[app-update] Opening WhatsApp channel:', OPTS.whatsappUrl);
                openExternal(OPTS.whatsappUrl);
            });
        }

        // ── Maybe Later — snooze + close ──
        var laterBtn = instructions.querySelector('#appUpdateLaterBtn');
        if (laterBtn) {
            laterBtn.addEventListener('click', function () {
                snooze();
                closeInstructions();
                console.log('[app-update] Snoozed for ' + (OPTS.snoozeMs / 60000) + ' minutes.');
            });
        }
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MAIN CHECK
     * ═══════════════════════════════════════════════════════════════ */
    function checkForUpdate() {
        // Not Android at all — skip
        if (!isAndroid()) {
            console.log('[app-update] Not Android — skipping.');
            return;
        }

        // Android but not a WebView — skip
        if (!isInWebViewAPK()) {
            console.log('[app-update] Android browser — skipping.');
            return;
        }

        // User already snoozed this session
        if (isSnoozed()) {
            console.log('[app-update] Snoozed — skipping.');
            return;
        }

        var inNewAPK = hasNewBridge();
        var installed = getInstalledVersion();
        var installedName = getInstalledVersionName();

        console.log('[app-update] In WebView. New bridge:', inNewAPK, '| Installed v' + installed);

        fetch(OPTS.versionJsonUrl + '?t=' + Date.now(), { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (info) {
                if (!info || !info.apkUrl) {
                    console.warn('[app-update] version.json invalid.');
                    return;
                }

                var latest = parseInt(info.versionCode, 10) || 0;
                console.log('[app-update] Latest versionCode:', latest);

                // Old APK — no bridge → force update
                if (!inNewAPK) {
                    console.log('[app-update] Old APK detected → forcing update.');
                    showUpdateModal(info, 0, '');
                    return;
                }

                // New APK — compare versions
                if (latest > installed) {
                    console.log('[app-update] Outdated → showing update.');
                    showUpdateModal(info, installed, installedName);
                } else {
                    console.log('[app-update] Up to date.');
                }
            })
            .catch(function (err) {
                console.warn('[app-update] Fetch failed:', err.message);
            });
    }

    /* ═══════════════════════════════════════════════════════════════
     *  BOOT
     * ═══════════════════════════════════════════════════════════════ */
    function boot(attempt) {
        attempt = attempt || 1;
        if (attempt > 10) return;

        if (document.readyState === 'loading') {
            setTimeout(function () { boot(attempt + 1); }, 400);
            return;
        }

        setTimeout(checkForUpdate, 300);
    }

    boot();

    /* ═══════════════════════════════════════════════════════════════
     *  PUBLIC API
     * ═══════════════════════════════════════════════════════════════ */
    window.AppUpdateChecker = {
        check: checkForUpdate,
        snooze: snooze,
        isSnoozed: isSnoozed,
        isInWebViewAPK: isInWebViewAPK,
        hasNewBridge: hasNewBridge,
        getInstalledVersion: getInstalledVersion,
        openWhatsApp: function () { openExternal(OPTS.whatsappUrl); },
        userAgent: navigator.userAgent
    };

    console.log('[app-update] Loaded (aggressive mode, snooze-enabled, WhatsApp fallback).');
})();    }

    function getInstalledVersion() {
        try {
            if (hasNewBridge()) {
                var v = window.AndroidUpdater.getAppVersion();
                var n = parseInt(v, 10);
                return isNaN(n) ? 0 : n;
            }
        } catch (e) {}
        return 0;
    }

    function getInstalledVersionName() {
        try {
            if (window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersionName === 'function') {
                var n = window.AndroidUpdater.getAppVersionName();
                if (n) return String(n);
            }
        } catch (e) {}
        return '';
    }

    /* ═══════════════════════════════════════════════════════════════
     *  SNOOZE
     * ═══════════════════════════════════════════════════════════════ */
    function isSnoozed() {
        try {
            var until = parseInt(sessionStorage.getItem(SNOOZE_KEY) || '0', 10);
            return until > Date.now();
        } catch (e) { return false; }
    }

    function snooze() {
        try {
            sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + OPTS.snoozeMs));
        } catch (e) {}
    }

    /* ═══════════════════════════════════════════════════════════════
     *  STYLES
     * ═══════════════════════════════════════════════════════════════ */
    function injectStyles() {
        if (document.getElementById('appUpdateStyles')) return;
        var dark = OPTS.theme === 'dark';
        var cardBg    = dark ? '#1e1e1e' : '#ffffff';
        var cardText  = dark ? '#e0e0e0' : '#1a1a1a';
        var titleText = dark ? '#ffffff' : '#1a1a1a';
        var bodyText  = dark ? '#b8b8b8' : '#5a5a5a';
        var chipBg    = dark ? '#2d2d2d' : '#f5f5f5';
        var chipText  = dark ? '#888888' : '#999999';
        var noteText  = dark ? '#777777' : '#a0a0a0';
        var laterText = dark ? '#b8b8b8' : '#8a8a8a';
        var laterActive = dark ? '#ffffff' : '#1a1a1a';

        var style = document.createElement('style');
        style.id = 'appUpdateStyles';
        style.textContent =
            '.app-update-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;opacity:0;transition:opacity 0.25s ease;-webkit-tap-highlight-color:transparent;overflow-y:auto;}' +
            '.app-update-overlay.show{opacity:1;}' +
            '.app-update-card{background:' + cardBg + ';color:' + cardText + ';width:90%;max-width:380px;border-radius:28px;padding:30px 24px 22px;text-align:center;box-shadow:0 25px 60px -12px rgba(0,0,0,0.5);transform:scale(0.92) translateY(12px);transition:transform 0.35s cubic-bezier(0.21,1.11,0.38,1);margin:auto;}' +
            '.app-update-overlay.show .app-update-card{transform:scale(1) translateY(0);}' +
            '.app-update-icon{width:70px;height:70px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(135deg,#00bfa5,#00a28b);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,191,165,0.35);animation:appUpdatePulse 1.6s ease-in-out infinite;}' +
            '@keyframes appUpdatePulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}' +
            '.app-update-icon svg{width:34px;height:34px;fill:#ffffff;}' +
            '.app-update-title{font-size:20px;font-weight:700;margin-bottom:8px;letter-spacing:-0.2px;color:' + titleText + ';}' +
            '.app-update-message{font-size:14px;line-height:1.5;color:' + bodyText + ';margin-bottom:22px;font-weight:500;}' +
            '.app-update-versions{display:flex;justify-content:center;gap:10px;font-size:12px;margin-bottom:22px;flex-wrap:wrap;color:' + chipText + ';}' +
            '.app-update-versions span{background:' + chipBg + ';padding:5px 12px;border-radius:20px;font-weight:600;}' +
            '.app-update-versions span b{color:#00bfa5;font-weight:700;}' +
            '.app-update-buttons{display:flex;flex-direction:column;gap:10px;}' +
            '.app-update-btn{width:100%;padding:15px 0;border-radius:60px;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform 0.15s,background 0.2s,box-shadow 0.2s;-webkit-tap-highlight-color:transparent;}' +
            '.app-update-btn-upgrade{background:#00bfa5;color:#ffffff;box-shadow:0 4px 14px rgba(0,191,165,0.4);}' +
            '.app-update-btn-upgrade:active{background:#00a28b;transform:scale(0.97);}' +
            '.app-update-btn-later{background:transparent;color:' + laterText + ';font-weight:500;font-size:14px;padding:10px 0;}' +
            '.app-update-btn-later:active{color:' + laterActive + ';}' +
            '.app-update-note{font-size:11px;margin-top:14px;color:' + noteText + ';}' +
            '.app-update-steps{text-align:left;font-size:13px;line-height:1.7;margin:0 0 18px 0;color:' + bodyText + ';background:' + chipBg + ';padding:14px 16px;border-radius:14px;}' +
            '.app-update-steps .step{margin-bottom:10px;display:flex;gap:10px;align-items:flex-start;}' +
            '.app-update-steps .step:last-child{margin-bottom:0;}' +
            '.app-update-steps .num{flex-shrink:0;font-weight:800;color:#00bfa5;min-width:18px;}' +
            '.app-update-steps b{color:' + titleText + ';font-weight:700;}';
        document.head.appendChild(style);
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MODAL 1 — FORCED UPDATE
     * ═══════════════════════════════════════════════════════════════ */
    function showUpdateModal(info, installedVer, installedName) {
        injectStyles();

        var existing = document.getElementById('appUpdateOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'appUpdateOverlay';
        overlay.className = 'app-update-overlay';

        var latestVer  = parseInt(info.versionCode, 10) || 0;
        var latestName = info.versionName || '';

        var customMessage = (info.message || '').trim();
        var defaultMessage = 'A new version of OPay Plus is available. Please update to continue using the app.';
        var messageText = customMessage || defaultMessage;

        var installedLabel = installedVer > 0
            ? 'v' + installedVer + (installedName ? ' (' + installedName + ')' : '')
            : 'Old version';

        var latestLabel = 'v' + latestVer + (latestName ? ' (' + latestName + ')' : '');

        overlay.innerHTML =
            '<div class="app-update-card" role="dialog" aria-modal="true">' +
                '<div class="app-update-icon">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="app-update-title">Update Required</div>' +
                '<div class="app-update-message"></div>' +
                '<div class="app-update-versions">' +
                    '<span>Installed: <b>' + installedLabel + '</b></span>' +
                    '<span>Latest: <b>' + latestLabel + '</b></span>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateNowBtn">Update Now</button>' +
                '</div>' +
                '<div class="app-update-note">This update is required to continue using the app.</div>' +
            '</div>';

        overlay.querySelector('.app-update-message').textContent = messageText;

        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            overlay.classList.add('show');
        });

        // Block ESC
        function blockEscape(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
        }
        document.addEventListener('keydown', blockEscape, true);

        // Prevent backdrop taps from closing
        overlay.addEventListener('click', function (e) { e.stopPropagation(); });

        var nowBtn = overlay.querySelector('#appUpdateNowBtn');
        if (nowBtn) {
            nowBtn.addEventListener('click', function () {
                var apkUrl = (info.apkUrl || '').trim();
                if (!apkUrl) { console.warn('[app-update] No apkUrl.'); return; }

                // New APK (v9+) — use native installer
                if (window.AndroidUpdater && typeof window.AndroidUpdater.installUpdate === 'function') {
                    try {
                        window.AndroidUpdater.installUpdate(apkUrl);
                        return;
                    } catch (e) {}
                }

                // Old APK (v8) — show install instructions
                showInstallInstructions(apkUrl, overlay);
            });
        }
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MODAL 2 — INSTALL INSTRUCTIONS (with Maybe Later)
     * ═══════════════════════════════════════════════════════════════ */
    function showInstallInstructions(apkUrl, previousOverlay) {
        // Hide the first modal
        if (previousOverlay) {
            previousOverlay.classList.remove('show');
            setTimeout(function () {
                if (previousOverlay.parentNode) previousOverlay.parentNode.removeChild(previousOverlay);
            }, 250);
        }

        injectStyles();

        var existing = document.getElementById('appUpdateInstructions');
        if (existing) existing.remove();

        var instructions = document.createElement('div');
        instructions.id = 'appUpdateInstructions';
        instructions.className = 'app-update-overlay';

        instructions.innerHTML =
            '<div class="app-update-card" role="dialog" aria-modal="true">' +
                '<div class="app-update-icon">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="app-update-title">Finish the Update</div>' +
                '<div class="app-update-steps">' +
                    '<div class="step">' +
                        '<span class="num">1.</span>' +
                        '<span>Tap <b>Continue to Download</b> below.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">2.</span>' +
                        '<span>When Android says <b>"Blocked"</b> or <b>"Install unknown apps"</b>, tap <b>Settings</b>.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">3.</span>' +
                        '<span>Turn ON <b>"Allow from this source"</b>.</span>' +
                    '</div>' +
                    '<div class="step">' +
                        '<span class="num">4.</span>' +
                        '<span>Go back and tap <b>Install</b> again.</span>' +
                    '</div>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateContinueBtn">Continue to Download</button>' +
                    '<button class="app-update-btn app-update-btn-later" type="button" id="appUpdateLaterBtn">Maybe Later</button>' +
                '</div>' +
                '<div class="app-update-note">This is a one-time setup. Future updates install automatically.</div>' +
            '</div>';

        document.body.appendChild(instructions);

        requestAnimationFrame(function () {
            instructions.classList.add('show');
        });

        function closeInstructions() {
            instructions.classList.remove('show');
            setTimeout(function () {
                if (instructions.parentNode) instructions.parentNode.removeChild(instructions);
            }, 250);
        }

        // Continue to Download
        var continueBtn = instructions.querySelector('#appUpdateContinueBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', function () {
                // Try external browser first (most have install-permission enabled)
                try {
                    var opened = window.open(apkUrl, '_blank');
                    if (!opened) {
                        // Popup blocked — fall back to current context
                        window.location.href = apkUrl;
                    }
                } catch (e) {
                    try { window.location.href = apkUrl; } catch (e2) {}
                }
                // Keep the modal open so the user can come back
                // (they'll see it again if the install fails)
            });
        }

        // Maybe Later — snooze + close
        var laterBtn = instructions.querySelector('#appUpdateLaterBtn');
        if (laterBtn) {
            laterBtn.addEventListener('click', function () {
                snooze();
                closeInstructions();
                console.log('[app-update] Snoozed for ' + (OPTS.snoozeMs / 60000) + ' minutes.');
            });
        }
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MAIN CHECK
     * ═══════════════════════════════════════════════════════════════ */
    function checkForUpdate() {
        // Not Android at all — skip
        if (!isAndroid()) {
            console.log('[app-update] Not Android — skipping.');
            return;
        }

        // Android but not a WebView — skip
        if (!isInWebViewAPK()) {
            console.log('[app-update] Android browser — skipping.');
            return;
        }

        // User already snoozed this session
        if (isSnoozed()) {
            console.log('[app-update] Snoozed — skipping.');
            return;
        }

        var inNewAPK = hasNewBridge();
        var installed = getInstalledVersion();
        var installedName = getInstalledVersionName();

        console.log('[app-update] In WebView. New bridge:', inNewAPK, '| Installed v' + installed);

        fetch(OPTS.versionJsonUrl + '?t=' + Date.now(), { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (info) {
                if (!info || !info.apkUrl) {
                    console.warn('[app-update] version.json invalid.');
                    return;
                }

                var latest = parseInt(info.versionCode, 10) || 0;
                console.log('[app-update] Latest versionCode:', latest);

                // Old APK — no bridge → force update
                if (!inNewAPK) {
                    console.log('[app-update] Old APK detected → forcing update.');
                    showUpdateModal(info, 0, '');
                    return;
                }

                // New APK — compare versions
                if (latest > installed) {
                    console.log('[app-update] Outdated → showing update.');
                    showUpdateModal(info, installed, installedName);
                } else {
                    console.log('[app-update] Up to date.');
                }
            })
            .catch(function (err) {
                console.warn('[app-update] Fetch failed:', err.message);
            });
    }

    /* ═══════════════════════════════════════════════════════════════
     *  BOOT
     * ═══════════════════════════════════════════════════════════════ */
    function boot(attempt) {
        attempt = attempt || 1;
        if (attempt > 10) return;

        if (document.readyState === 'loading') {
            setTimeout(function () { boot(attempt + 1); }, 400);
            return;
        }

        setTimeout(checkForUpdate, 300);
    }

    boot();

    /* ═══════════════════════════════════════════════════════════════
     *  PUBLIC API
     * ═══════════════════════════════════════════════════════════════ */
    window.AppUpdateChecker = {
        check: checkForUpdate,
        snooze: snooze,
        isSnoozed: isSnoozed,
        isInWebViewAPK: isInWebViewAPK,
        hasNewBridge: hasNewBridge,
        getInstalledVersion: getInstalledVersion,
        userAgent: navigator.userAgent
    };

    console.log('[app-update] Loaded (aggressive mode, snooze-enabled).');
})();        } catch (e) {}
        return 0;
    }

    function getInstalledVersionName() {
        try {
            if (window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersionName === 'function') {
                var n = window.AndroidUpdater.getAppVersionName();
                if (n) return String(n);
            }
        } catch (e) {}
        return '';
    }

    function injectStyles() {
        if (document.getElementById('appUpdateStyles')) return;
        var dark = OPTS.theme === 'dark';
        var cardBg    = dark ? '#1e1e1e' : '#ffffff';
        var cardText  = dark ? '#e0e0e0' : '#1a1a1a';
        var titleText = dark ? '#ffffff' : '#1a1a1a';
        var bodyText  = dark ? '#b8b8b8' : '#5a5a5a';
        var chipBg    = dark ? '#2d2d2d' : '#f5f5f5';
        var chipText  = dark ? '#888888' : '#999999';
        var noteText  = dark ? '#777777' : '#a0a0a0';

        var style = document.createElement('style');
        style.id = 'appUpdateStyles';
        style.textContent =
            '.app-update-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:20px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;opacity:0;transition:opacity 0.25s ease;-webkit-tap-highlight-color:transparent;}' +
            '.app-update-overlay.show{opacity:1;}' +
            '.app-update-card{background:' + cardBg + ';color:' + cardText + ';width:90%;max-width:360px;border-radius:28px;padding:30px 24px 22px;text-align:center;box-shadow:0 25px 60px -12px rgba(0,0,0,0.5);transform:scale(0.92) translateY(12px);transition:transform 0.35s cubic-bezier(0.21,1.11,0.38,1);}' +
            '.app-update-overlay.show .app-update-card{transform:scale(1) translateY(0);}' +
            '.app-update-icon{width:70px;height:70px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(135deg,#00bfa5,#00a28b);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,191,165,0.35);animation:appUpdatePulse 1.6s ease-in-out infinite;}' +
            '@keyframes appUpdatePulse{0%,100%{transform:scale(1);}50%{transform:scale(1.06);}}' +
            '.app-update-icon svg{width:34px;height:34px;fill:#ffffff;}' +
            '.app-update-title{font-size:20px;font-weight:700;margin-bottom:8px;letter-spacing:-0.2px;color:' + titleText + ';}' +
            '.app-update-message{font-size:14px;line-height:1.5;color:' + bodyText + ';margin-bottom:22px;font-weight:500;}' +
            '.app-update-versions{display:flex;justify-content:center;gap:10px;font-size:12px;margin-bottom:22px;flex-wrap:wrap;color:' + chipText + ';}' +
            '.app-update-versions span{background:' + chipBg + ';padding:5px 12px;border-radius:20px;font-weight:600;}' +
            '.app-update-versions span b{color:#00bfa5;font-weight:700;}' +
            '.app-update-buttons{display:flex;flex-direction:column;gap:10px;}' +
            '.app-update-btn{width:100%;padding:15px 0;border-radius:60px;border:none;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform 0.15s,background 0.2s,box-shadow 0.2s;-webkit-tap-highlight-color:transparent;}' +
            '.app-update-btn-upgrade{background:#00bfa5;color:#ffffff;box-shadow:0 4px 14px rgba(0,191,165,0.4);}' +
            '.app-update-btn-upgrade:active{background:#00a28b;transform:scale(0.97);}' +
            '.app-update-note{font-size:11px;margin-top:14px;color:' + noteText + ';}';
        document.head.appendChild(style);
    }

    function showUpdateModal(info, installedVer, installedName) {
        injectStyles();

        var existing = document.getElementById('appUpdateOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'appUpdateOverlay';
        overlay.className = 'app-update-overlay';

        var latestVer  = parseInt(info.versionCode, 10) || 0;
        var latestName = info.versionName || '';

        var customMessage = (info.message || '').trim();
        var defaultMessage = 'A new version of OPay Plus is available. Please update to continue using the app.';
        var messageText = customMessage || defaultMessage;

        var installedLabel = installedVer > 0
            ? 'v' + installedVer + (installedName ? ' (' + installedName + ')' : '')
            : 'Old version';

        var latestLabel = 'v' + latestVer + (latestName ? ' (' + latestName + ')' : '');

        overlay.innerHTML =
            '<div class="app-update-card" role="dialog" aria-modal="true">' +
                '<div class="app-update-icon">' +
                    '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
                        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>' +
                    '</svg>' +
                '</div>' +
                '<div class="app-update-title">Update Required</div>' +
                '<div class="app-update-message"></div>' +
                '<div class="app-update-versions">' +
                    '<span>Installed: <b>' + installedLabel + '</b></span>' +
                    '<span>Latest: <b>' + latestLabel + '</b></span>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateNowBtn">Update Now</button>' +
                '</div>' +
                '<div class="app-update-note">This update is required to continue using the app.</div>' +
            '</div>';

        overlay.querySelector('.app-update-message').textContent = messageText;

        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            overlay.classList.add('show');
        });

        function blockEscape(e) {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
        }
        document.addEventListener('keydown', blockEscape, true);

        overlay.addEventListener('click', function (e) { e.stopPropagation(); });

        var nowBtn = overlay.querySelector('#appUpdateNowBtn');
        if (nowBtn) {
            nowBtn.addEventListener('click', function () {
                var apkUrl = (info.apkUrl || '').trim();
                if (!apkUrl) { console.warn('[app-update] No apkUrl.'); return; }

                // New APK — use native installer
                if (window.AndroidUpdater && typeof window.AndroidUpdater.installUpdate === 'function') {
                    try {
                        window.AndroidUpdater.installUpdate(apkUrl);
                        return;
                    } catch (e) {}
                }

                // Old APK — navigate to the URL; the WebView's default
                // download handler will catch the .apk and prompt to install
                try { window.location.href = apkUrl; }
                catch (e) { try { window.open(apkUrl, '_blank'); } catch (e2) {} }
            });
        }
    }

    function checkForUpdate() {
        // Not on Android at all — skip
        if (!isAndroid()) {
            console.log('[app-update] Not Android — skipping.');
            return;
        }

        // Only run inside an APK WebView
        if (!isInWebViewAPK()) {
            console.log('[app-update] Android browser — skipping.');
            return;
        }

        var inNewAPK = hasNewBridge();
        var installed = getInstalledVersion();
        var installedName = getInstalledVersionName();

        console.log('[app-update] In WebView. New bridge:', inNewAPK, '| Installed v' + installed);

        fetch(OPTS.versionJsonUrl + '?t=' + Date.now(), { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (info) {
                if (!info || !info.apkUrl) {
                    console.warn('[app-update] version.json invalid.');
                    return;
                }

                var latest = parseInt(info.versionCode, 10) || 0;
                console.log('[app-update] Latest versionCode:', latest);

                // Old APK — no bridge → force update
                if (!inNewAPK) {
                    console.log('[app-update] Old APK detected → forcing update.');
                    showUpdateModal(info, 0, '');
                    return;
                }

                // New APK — compare versions
                if (latest > installed) {
                    console.log('[app-update] Outdated → showing update.');
                    showUpdateModal(info, installed, installedName);
                } else {
                    console.log('[app-update] Up to date.');
                }
            })
            .catch(function (err) {
                console.warn('[app-update] Fetch failed:', err.message);
            });
    }

    // Boot with retries so we catch the bridge if it's still initializing
    function boot(attempt) {
        attempt = attempt || 1;
        if (attempt > 10) return;

        if (document.readyState === 'loading') {
            setTimeout(function () { boot(attempt + 1); }, 400);
            return;
        }

        setTimeout(checkForUpdate, 300);
    }

    boot();

    window.AppUpdateChecker = {
        check: checkForUpdate,
        isInWebViewAPK: isInWebViewAPK,
        hasNewBridge: hasNewBridge,
        getInstalledVersion: getInstalledVersion,
        userAgent: navigator.userAgent
    };
})();
