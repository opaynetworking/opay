// pwa-check.js – Full version: Android only allows APK WebView, iOS only allows "Add to Home Screen"
(function() {
  // ----- Helper: Detect platform -----
  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }
  
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }
  
  // ----- 1. Detect WebView environment (Android WebView / Sketchware) -----
  function isInWebView() {
    var ua = navigator.userAgent.toLowerCase();
    // Android WebView includes "wv"
    return ua.indexOf('wv') !== -1 ||
      (ua.indexOf('webkit') !== -1 && ua.indexOf('mobile') !== -1 && ua.indexOf('safari') === -1);
  }
  
  // ----- 2. Detect custom flag injected by your Sketchware APK code -----
  function isTrustedWebView() {
    return window.__opay_webview === true;
  }
  
  // ----- 3. Detect standalone mode (added to home screen / PWA) -----
  function isStandalone() {
    return (
      ('standalone' in window.navigator && window.navigator.standalone) ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  }
  
  // ----- 4. Main enforcement: Android → APK only, iOS → Standalone only -----
  var allowed = false;
  
  if (isAndroid()) {
    // On Android: allow only if inside a WebView (APK) or trusted flag is set
    allowed = isInWebView() || isTrustedWebView();
    if (allowed) {
      console.log('Android: Access granted (WebView / APK)');
    } else {
      console.log('Android: Access denied – not in APK WebView');
    }
  }
  else if (isIOS()) {
    // On iOS: allow only if added to home screen (standalone)
    allowed = isStandalone();
    if (allowed) {
      console.log('iOS: Access granted (standalone / home screen)');
    } else {
      console.log('iOS: Access denied – not added to home screen');
    }
  }
  else {
    // Desktop or unknown platform: block access (redirect)
    allowed = false;
    console.log('Desktop/unknown platform: Access denied');
  }
  
  // ----- 5. Redirect if not allowed, but avoid redirect loops on the install page -----
  if (!allowed) {
    var path = window.location.pathname;
    var isInstallPage = (path === '/' || path === '/index.html');
    if (!isInstallPage) {
      console.log('Redirecting to install page (index.html)');
      window.location.replace('/');
    }
  }
})();