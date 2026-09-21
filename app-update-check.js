/* ============================================================================
 * app-update-check.js
 * ----------------------------------------------------------------------------
 * Detects outdated OPay Plus APKs and forces an update prompt.
 *
 * Add this to any page with ONE line:
 *
 *     <script src="/app-update-check.js"></script>
 *
 * How it works:
 *   1. Only runs inside the APK (checks for the AndroidUpdater bridge).
 *   2. Reads the installed versionCode (via AndroidUpdater.getAppVersion()).
 *   3. Fetches /version.json (cache-bypassed).
 *   4. Compares them. If installed < latest → shows update modal (no dismiss).
 *   5. "Update Now" calls AndroidUpdater.installUpdate(apkUrl).
 *
 * Known baseline:
 *   Old APK versionCode  = 8    (versionName "3.1 opayplus")
 *   Any version > 8 in version.json triggers the mandatory update prompt.
 *
 * version.json format:
 *     {
 *         "versionCode": 9,
 *         "versionName": "3.2 opayplus",
 *         "apkUrl": "https://opayplus.vercel.app/download/v9/OPay+Plus.apk",
 *         "message": "New features and bug fixes."
 *     }
 * ==========================================================================*/

(function () {
    'use strict';

    /* ═══════════════════════════════════════════════════════════════
     *  CONFIG
     * ═══════════════════════════════════════════════════════════════ */
    var OLD_VERSION_CODE = 8;
    var OLD_VERSION_NAME = '3.1 opayplus';

    var OPTS = Object.assign({
        versionJsonUrl: '/version.json',
        theme: 'light'
    }, window.APP_UPDATE_OPTIONS || {});

    /* ═══════════════════════════════════════════════════════════════
     *  HELPERS
     * ═══════════════════════════════════════════════════════════════ */
    function isRunningInAPK() {
        return !!(window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersion === 'function');
    }

    function getInstalledVersion() {
        try {
            if (window.AndroidUpdater && typeof window.AndroidUpdater.getAppVersion === 'function') {
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

        var style = document.createElement('style');
        style.id = 'appUpdateStyles';
        style.textContent =
            '.app-update-overlay{' +
                'position:fixed;inset:0;' +
                'background:rgba(0,0,0,0.75);' +
                'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
                'display:flex;align-items:center;justify-content:center;' +
                'z-index:2147483000;padding:20px;' +
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
                'opacity:0;transition:opacity 0.25s ease;' +
                '-webkit-tap-highlight-color:transparent;' +
            '}' +
            '.app-update-overlay.show{opacity:1;}' +
            '.app-update-card{' +
                'background:' + cardBg + ';' +
                'color:' + cardText + ';' +
                'width:90%;max-width:360px;' +
                'border-radius:28px;' +
                'padding:30px 24px 22px;' +
                'text-align:center;' +
                'box-shadow:0 25px 60px -12px rgba(0,0,0,0.5);' +
                'transform:scale(0.92) translateY(12px);' +
                'transition:transform 0.35s cubic-bezier(0.21,1.11,0.38,1);' +
            '}' +
            '.app-update-overlay.show .app-update-card{transform:scale(1) translateY(0);}' +
            '.app-update-icon{' +
                'width:70px;height:70px;' +
                'margin:0 auto 18px;' +
                'border-radius:50%;' +
                'background:linear-gradient(135deg,#00bfa5,#00a28b);' +
                'display:flex;align-items:center;justify-content:center;' +
                'box-shadow:0 8px 24px rgba(0,191,165,0.35);' +
                'animation:appUpdatePulse 1.6s ease-in-out infinite;' +
            '}' +
            '@keyframes appUpdatePulse{' +
                '0%,100%{transform:scale(1);}' +
                '50%{transform:scale(1.06);}' +
            '}' +
            '.app-update-icon svg{width:34px;height:34px;fill:#ffffff;}' +
            '.app-update-title{' +
                'font-size:20px;font-weight:700;' +
                'margin-bottom:8px;letter-spacing:-0.2px;' +
                'color:' + titleText + ';' +
            '}' +
            '.app-update-message{' +
                'font-size:14px;line-height:1.5;' +
                'color:' + bodyText + ';' +
                'margin-bottom:22px;font-weight:500;' +
            '}' +
            '.app-update-versions{' +
                'display:flex;justify-content:center;gap:10px;' +
                'font-size:12px;margin-bottom:22px;flex-wrap:wrap;' +
                'color:' + chipText + ';' +
            '}' +
            '.app-update-versions span{' +
                'background:' + chipBg + ';' +
                'padding:5px 12px;border-radius:20px;font-weight:600;' +
            '}' +
            '.app-update-versions span b{color:#00bfa5;font-weight:700;}' +
            '.app-update-buttons{display:flex;flex-direction:column;gap:10px;}' +
            '.app-update-btn{' +
                'width:100%;padding:15px 0;' +
                'border-radius:60px;border:none;' +
                'font-size:15px;font-weight:600;' +
                'cursor:pointer;font-family:inherit;' +
                'transition:transform 0.15s,background 0.2s,box-shadow 0.2s;' +
                '-webkit-tap-highlight-color:transparent;' +
            '}' +
            '.app-update-btn-upgrade{' +
                'background:#00bfa5;color:#ffffff;' +
                'box-shadow:0 4px 14px rgba(0,191,165,0.4);' +
            '}' +
            '.app-update-btn-upgrade:active{' +
                'background:#00a28b;transform:scale(0.97);' +
            '}' +
            '.app-update-note{' +
                'font-size:11px;margin-top:14px;' +
                'color:' + noteText + ';' +
            '}';
        document.head.appendChild(style);
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MODAL
     * ═══════════════════════════════════════════════════════════════ */
    function showUpdateModal(info) {
        injectStyles();

        var existing = document.getElementById('appUpdateOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'appUpdateOverlay';
        overlay.className = 'app-update-overlay';

        var installedVer  = getInstalledVersion() || OLD_VERSION_CODE;
        var installedName = getInstalledVersionName() || OLD_VERSION_NAME;

        var latestVer  = parseInt(info.versionCode, 10) || 0;
        var latestName = info.versionName || '';

        var customMessage = (info.message || '').trim();
        var defaultMessage = 'A new version of OPay Plus is available with improvements and bug fixes. Please update to continue using the app.';
        var messageText = customMessage || defaultMessage;

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
                    '<span>Installed: <b>v' + installedVer + (installedName ? ' (' + installedName + ')' : '') + '</b></span>' +
                    '<span>Latest: <b>v' + latestVer + (latestName ? ' (' + latestName + ')' : '') + '</b></span>' +
                '</div>' +
                '<div class="app-update-buttons">' +
                    '<button class="app-update-btn app-update-btn-upgrade" type="button" id="appUpdateNowBtn">' +
                        'Update Now' +
                    '</button>' +
                '</div>' +
                '<div class="app-update-note">This update is required to continue using the app.</div>' +
            '</div>';

        overlay.querySelector('.app-update-message').textContent = messageText;

        document.body.appendChild(overlay);

        requestAnimationFrame(function () {
            overlay.classList.add('show');
        });

        // Prevent accidental dismissal — disable back button / ESC
        function blockDismiss(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        document.addEventListener('keydown', blockDismiss, true);

        // Prevent taps from closing the overlay (only the Update button works)
        overlay.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        // Update button
        var nowBtn = overlay.querySelector('#appUpdateNowBtn');
        if (nowBtn) {
            nowBtn.addEventListener('click', function () {
                var apkUrl = (info.apkUrl || '').trim();
                if (!apkUrl) {
                    console.warn('[app-update] No apkUrl provided.');
                    return;
                }
                try {
                    if (window.AndroidUpdater && typeof window.AndroidUpdater.installUpdate === 'function') {
                        window.AndroidUpdater.installUpdate(apkUrl);
                    } else {
                        window.location.href = apkUrl;
                    }
                } catch (e) {
                    console.warn('[app-update] installUpdate failed:', e);
                }
            });
        }

        console.log('[app-update] Mandatory update modal displayed.');
    }

    /* ═══════════════════════════════════════════════════════════════
     *  MAIN CHECK
     * ═══════════════════════════════════════════════════════════════ */
    function checkForUpdate() {
        if (!isRunningInAPK()) {
            console.log('[app-update] Not in APK — skipping.');
            return;
        }

        var installed = getInstalledVersion();
        var installedName = getInstalledVersionName() || OLD_VERSION_NAME;
        console.log('[app-update] Installed versionCode:', installed, '(' + installedName + ')');

        fetch(OPTS.versionJsonUrl + '?t=' + Date.now(), { cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (info) {
                if (!info) return;

                var latest = parseInt(info.versionCode, 10) || 0;
                var apkUrl = (info.apkUrl || '').trim();

                console.log('[app-update] Latest versionCode:', latest);

                if (latest <= installed) {
                    console.log('[app-update] App is up to date.');
                    return;
                }

                if (!apkUrl) {
                    console.warn('[app-update] apkUrl missing in version.json.');
                    return;
                }

                console.log('[app-update] Outdated APK detected — showing mandatory update.');
                showUpdateModal(info);
            })
            .catch(function (err) {
                console.warn('[app-update] Failed to fetch version.json:', err.message);
            });
    }

    /* ═══════════════════════════════════════════════════════════════
     *  AUTO-START
     * ═══════════════════════════════════════════════════════════════ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            setTimeout(checkForUpdate, 800);
        });
    } else {
        setTimeout(checkForUpdate, 800);
    }

    /* ═══════════════════════════════════════════════════════════════
     *  PUBLIC API
     * ═══════════════════════════════════════════════════════════════ */
    window.AppUpdateChecker = {
        check: checkForUpdate,
        isRunningInAPK: isRunningInAPK,
        getInstalledVersion: getInstalledVersion,
        getInstalledVersionName: getInstalledVersionName,
        oldVersionCode: OLD_VERSION_CODE,
        oldVersionName: OLD_VERSION_NAME
    };

    console.log('[app-update] Loaded (baseline v' + OLD_VERSION_CODE + ' — ' + OLD_VERSION_NAME + ')');
})();
