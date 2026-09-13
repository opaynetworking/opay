// pwa-check.js – Full version: Android only allows APK WebView, iOS only allows "Add to Home Screen"
(function() {
  
  // ============================================================
  // 0. CONFIG – edit these values to match your app
  // ============================================================
  var CUSTOM_UA_TOKEN = "OpayPlusApp"; // must match the UA you set inside your Android app
  var TRUSTED_FLAG = "__opay_webview"; // must match the JS flag your Android app injects
  var INSTALL_PATHS = ["/", "/index.html"]; // pages that are allowed (no redirect loop)
  
  // ============================================================
  // 1. Platform detection
  // ============================================================
  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }
  
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  
  // ============================================================
  // 2. WebView detection (Android WebView / Sketchware / AppMint)
  // ============================================================
  function isInWebView() {
    var ua = navigator.userAgent.toLowerCase();
    
    // (a) Standard Android WebView marker
    if (ua.indexOf("wv") !== -1) return true;
    
    // (b) Very old / stripped WebView user-agents
    if (
      ua.indexOf("webkit") !== -1 &&
      ua.indexOf("mobile") !== -1 &&
      ua.indexOf("safari") === -1
    ) {
      return true;
    }
    
    // (c) Custom token added by your Android app (Section 4)
    if (ua.indexOf(CUSTOM_UA_TOKEN.toLowerCase()) !== -1) return true;
    
    return false;
  }
  
  // ============================================================
  // 3. Trusted flag injected by your Android app
  // ============================================================
  function isTrustedWebView() {
    // (a) Explicit flag set by evaluateJavascript(...)
    if (window[TRUSTED_FLAG] === true) return true;
    
    // (b) Custom UA token as a fallback (Section 4)
    if (
      typeof navigator !== "undefined" &&
      new RegExp(CUSTOM_UA_TOKEN, "i").test(navigator.userAgent)
    ) {
      return true;
    }
    
    // (c) Trusted Web Activity (Chrome TWA) – treated as native app
    if (document.referrer && document.referrer.indexOf("android-app://") === 0) {
      return true;
    }
    
    return false;
  }
  
  // ============================================================
  // 4. Standalone / PWA detection (used for iOS)
  // ============================================================
  function isStandalone() {
    return (
      ("standalone" in window.navigator && window.navigator.standalone) ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches
    );
  }
  
  // ============================================================
  // 5. Main enforcement
  //    Android → APK WebView only
  //    iOS     → Add to Home Screen only
  // ============================================================
  var allowed = false;
  var platform = "unknown";
  
  if (isAndroid()) {
    platform = "android";
    allowed = isInWebView() || isTrustedWebView();
    console.log(
      "Android: " + (allowed ? "Access granted (WebView / APK)" : "Access denied – not in APK WebView")
    );
  } else if (isIOS()) {
    platform = "ios";
    allowed = isStandalone() || isTrustedWebView();
    console.log(
      "iOS: " + (allowed ? "Access granted (standalone / home screen)" : "Access denied – not added to home screen")
    );
  } else {
    platform = "desktop";
    allowed = false;
    console.log("Desktop/unknown platform: Access denied");
  }
  
  // ============================================================
  // 6. Redirect if not allowed (with loop protection)
  // ============================================================
  if (!allowed) {
    var path = window.location.pathname;
    var isInstallPage = INSTALL_PATHS.indexOf(path) !== -1;
    
    // Prevent infinite redirect loops
    var alreadyRedirected = sessionStorage.getItem("pwa_redirected") === "1";
    
    if (!isInstallPage && !alreadyRedirected) {
      sessionStorage.setItem("pwa_redirected", "1");
      console.log("Redirecting to install page (index.html)");
      window.location.replace("/");
    } else if (isInstallPage) {
      // Allow the install page to show instructions
      console.log("On install page – showing instructions");
    }
  } else {
    // Access granted – clear the redirect guard so future loads work
    sessionStorage.removeItem("pwa_redirected");
  }
  
  // ============================================================
  // 7. Expose helpers for debugging (optional)
  // ============================================================
  window.__pwaCheck = {
    isAndroid: isAndroid,
    isIOS: isIOS,
    isInWebView: isInWebView,
    isTrustedWebView: isTrustedWebView,
    isStandalone: isStandalone,
    platform: platform,
    allowed: allowed,
    CUSTOM_UA_TOKEN: CUSTOM_UA_TOKEN,
    TRUSTED_FLAG: TRUSTED_FLAG
  };
  
})();
