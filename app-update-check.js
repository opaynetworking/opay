/* app-update-check.js — AGGRESSIVE DETECTION VERSION
 * ----------------------------------------------------------------------------
 * Detects old APKs even if the WebView User-Agent doesn't contain the
 * standard "wv" marker.
 *
 *   • Any Android device + no AndroidUpdater bridge → treat as old APK
 *     (shows forced update)
 *   • Any Android device + has AndroidUpdater bridge → compare versions
 *   • Non-Android devices → skip entirely
 * ==========================================================================*/

(function () {
    'use strict';

    var OPTS = Object.assign({
        versionJsonUrl: '/version.json',
        theme: 'light',
        // Set to true to ONLY prompt when UA clearly shows a WebView.
        // Set to false (default) to prompt any Android without the bridge.
        requireWebViewMarker: false
    }, window.APP_UPDATE_OPTIONS || {});

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

    // Is this likely an app-embedded WebView (vs a browser)?
    function isInWebViewAPK() {
        if (!isAndroid()) return false;
        if (hasWvMarker()) return true;
        // If OPTS.requireWebViewMarker is false, accept any Android
        // device that is NOT a known browser.
        if (OPTS.requireWebViewMarker === false) {
            var ua = navigator.userAgent.toLowerCase();
            var isRealBrowser =
                ua.indexOf('chrome/') !== -1 && ua.indexOf('version/4.0') === -1 ||
                ua.indexOf('firefox/') !== -1 ||
                ua.indexOf('samsungbrowser') !== -1 ||
                ua.indexOf('edg') !== -1 ||
                ua.indexOf('opera') !== -1 ||
                ua.indexOf('brave') !== -1;
            // Old WebViews often report "Version/4.0" without "wv"
            if (ua.indexOf('version/4.0') !== -1) return true;
            // If it's a real browser, skip; otherwise treat as APK
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
