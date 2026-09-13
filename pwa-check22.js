// pwa-check.js – Full version: Android → APK WebView only, iOS → Add to Home Screen only
(function () {
  "use strict";

  try {

    // ============================================================
    // 0. CONFIG – edit these to match your app
    // ============================================================
    var CUSTOM_UA_TOKEN  = "OpayPlusApp";       // UA token your Android app appends
    var TRUSTED_FLAG     = "__opay_webview";    // JS flag your Android app injects
    var TRUSTED_STORAGE  = "__opay_trusted";    // localStorage key that persists trust
    var INSTALL_PATHS    = ["/", "/index.html"];
    var DEBUG            = true;                // set false in production

    function log() {
      if (DEBUG && window.console && console.log) {
        console.log.apply(console, ["[pwa-check]"].concat([].slice.call(arguments)));
      }
    }

    // ============================================================
    // 1. Safe helpers
    // ============================================================
    function safeStorageGet(store, key) {
      try { return store.getItem(key); } catch (e) { return null; }
    }
    function safeStorageSet(store, key, val) {
      try { store.setItem(key, val); } catch (e) {}
    }
    function safeStorageRemove(store, key) {
      try { store.removeItem(key); } catch (e) {}
    }
    function safeMatchMedia(q) {
      try {
        return !!(window.matchMedia && window.matchMedia(q).matches);
      } catch (e) { return false; }
    }
    function uaLower() {
      return (navigator && navigator.userAgent ? navigator.userAgent : "").toLowerCase();
    }

    // ============================================================
    // 2. Platform detection
    // ============================================================
    function isAndroid() { return /android/i.test(navigator.userAgent || ""); }
    function isIOS()     { return /iphone|ipad|ipod/i.test(navigator.userAgent || ""); }

    // ============================================================
    // 3. WebView detection (Android WebView / Sketchware / AppMint / TWA)
    // ============================================================
    function isInWebView() {
      var ua = uaLower();

      // (a) Standard Android WebView marker
      if (ua.indexOf("wv") !== -1) return true;

      // (b) Stripped / old WebView UA
      if (ua.indexOf("webkit") !== -1 &&
          ua.indexOf("mobile") !== -1 &&
          ua.indexOf("safari") === -1) return true;

      // (c) Custom UA token your Android app appends
      if (ua.indexOf(CUSTOM_UA_TOKEN.toLowerCase()) !== -1) return true;

      // (d) Trusted Web Activity (Chrome TWA)
      if (document.referrer && document.referrer.indexOf("android-app://") === 0) return true;

      // (e) JavaScript bridge injected by native code
      if (hasJsBridge()) return true;

      // (f) Screenshot-style flag many WebView wrappers set
      if (navigator.standalone === true) return true;

      return false;
    }

    // Detects common Android WebView JS bridges
    function hasJsBridge() {
      return !!(
        window.Android        ||
        window.AndroidBridge  ||
        window.android        ||
        window.AndroidInterface ||
        window.NativeBridge   ||
        window.JSBridge       ||
        window.appBridge      ||
        window.__native        ||
        window.ReactNativeWebView ||
        window.webkit && window.webkit.messageHandlers
      );
    }

    // ============================================================
    // 4. Trusted checks (flag, token, persisted state, URL override)
    // ============================================================
    function isTrustedWebView() {

      // (a) Flag injected by evaluateJavascript(...)
      if (window[TRUSTED_FLAG] === true) {
        safeStorageSet(window.localStorage, TRUSTED_STORAGE, "1");
        return true;
      }

      // (b) Custom UA token
      if (new RegExp(CUSTOM_UA_TOKEN, "i").test(navigator.userAgent || "")) {
        safeStorageSet(window.localStorage, TRUSTED_STORAGE, "1");
        return true;
      }

      // (c) Persisted trust from a previous page load in the same app
      if (safeStorageGet(window.localStorage, TRUSTED_STORAGE) === "1") return true;

      // (d) Explicit ?native=1 override (useful for debugging / emergency access)
      if (/[?&]native=1\b/.test(window.location.search)) {
        safeStorageSet(window.localStorage, TRUSTED_STORAGE, "1");
        return true;
      }

      // (e) Trusted Web Activity referrer
      if (document.referrer && document.referrer.indexOf("android-app://") === 0) return true;

      // (f) Any JS bridge
      if (hasJsBridge()) return true;

      return false;
    }

    // ============================================================
    // 5. Standalone / PWA detection (iOS)
    // ============================================================
    function isStandalone() {
      return (
        (typeof navigator.standalone === "boolean" && navigator.standalone) ||
        safeMatchMedia("(display-mode: standalone)") ||
        safeMatchMedia("(display-mode: fullscreen)") ||
        safeMatchMedia("(display-mode: minimal-ui)")
      );
    }

    // ============================================================
    // 6. Main enforcement
    // ============================================================
    var allowed = false;
    var platform = "unknown";

    if (isAndroid()) {
      platform = "android";
      allowed = isInWebView() || isTrustedWebView();
      log("Android:", allowed ? "GRANTED" : "DENIED");
    } else if (isIOS()) {
      platform = "ios";
      // allow both real PWA and iOS WebView apps
      allowed = isStandalone() || isInWebView() || isTrustedWebView();
      log("iOS:", allowed ? "GRANTED" : "DENIED");
    } else {
      platform = "desktop";
      allowed = isTrustedWebView(); // allow if explicit override is present
      log("Desktop:", allowed ? "GRANTED (override)" : "DENIED");
    }

    // ============================================================
    // 7. Redirect if not allowed (with loop protection)
    // ============================================================
    if (!allowed) {
      var path = window.location.pathname || "/";
      var isInstallPage = INSTALL_PATHS.indexOf(path) !== -1;
      var alreadyRedirected =
        safeStorageGet(window.sessionStorage, "pwa_redirected") === "1";

      if (!isInstallPage && !alreadyRedirected) {
        safeStorageSet(window.sessionStorage, "pwa_redirected", "1");
        log("Redirecting to install page /");
        window.location.replace("/");
      } else {
        log(isInstallPage
          ? "On install page – showing install instructions"
          : "Already redirected this session – not looping");
      }
    } else {
      safeStorageRemove(window.sessionStorage, "pwa_redirected");
    }

    // ============================================================
    // 8. Debug helper
    // ============================================================
    window.__pwaCheck = {
      platform: platform,
      allowed: allowed,
      isAndroid: isAndroid,
      isIOS: isIOS,
      isInWebView: isInWebView,
      isTrustedWebView: isTrustedWebView,
      isStandalone: isStandalone,
      hasJsBridge: hasJsBridge,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
      CUSTOM_UA_TOKEN: CUSTOM_UA_TOKEN,
      TRUSTED_FLAG: TRUSTED_FLAG
    };

  } catch (err) {
    // Never break the page — if anything throws, log and continue
    if (window.console && console.error) {
      console.error("[pwa-check] fatal:", err);
    }
  }
})();