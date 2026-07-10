// network-popup.js – Shows a white dialog only when truly offline
(function() {
    // ----- Modal HTML/CSS (injected once) -----
    const modalHTML = `
    <div id="networkPopup" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100000; align-items: center; justify-content: center;">
        <div style="background: white; max-width: 320px; width: 85%; border-radius: 28px; padding: 32px 24px 36px; text-align: center; box-shadow: 0 20px 35px rgba(0,0,0,0.2); animation: fadeScale 0.2s ease-out;">
            <div style="margin-bottom: 20px;">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#F44336" stroke-width="1.5" fill="none"/>
                    <line x1="12" y1="8" x2="12" y2="12" stroke="#F44336" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="12" cy="16" r="1" fill="#F44336"/>
                    <path d="M4 4L20 20" stroke="#F44336" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
            <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 1rem; color: #1A2C3E; line-height: 1.4; margin-bottom: 28px;">
                Please check your internet connection and try again.
            </p>
            <button id="networkOkBtn" style="background: #00B876; border: none; padding: 12px 24px; border-radius: 40px; font-weight: 600; font-size: 1rem; color: white; cursor: pointer; width: 100%; transition: 0.2s;">
                Okay
            </button>
        </div>
    </div>
    <style>
        @keyframes fadeScale {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
        }
    </style>
    `;

    // Inject modal if not already present
    if (!document.getElementById('networkPopup')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const popup = document.getElementById('networkPopup');
    const okButton = document.getElementById('networkOkBtn');

    // Dismiss popup when "Okay" is clicked
    if (okButton) {
        okButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    }

    // Helper: check real internet connectivity (fetch a tiny resource)
    // Returns true only if fetch succeeds AND navigator.onLine is true
    async function isReallyConnected() {
        // If the browser already thinks we're offline, no need to fetch
        if (!navigator.onLine) return false;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch('https://www.google.com/generate_204', {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response.ok;
        } catch (err) {
            clearTimeout(timeoutId);
            // If fetch fails but browser says online, we still assume online (to avoid false popups)
            // This can happen if the endpoint is blocked but other internet works.
            return true;
        }
    }

    let isPopupVisible = false;

    async function updateNetworkPopup() {
        const connected = await isReallyConnected();
        if (!connected) {
            // Offline – show popup
            if (!isPopupVisible) {
                popup.style.display = 'flex';
                isPopupVisible = true;
            }
        } else {
            // Online – hide popup
            if (isPopupVisible) {
                popup.style.display = 'none';
                isPopupVisible = false;
            }
        }
    }

    // React to browser online/offline events
    window.addEventListener('online', () => updateNetworkPopup());
    window.addEventListener('offline', () => updateNetworkPopup());

    // Wait a moment after page load before checking (prevents flash on slow connections)
    setTimeout(updateNetworkPopup, 1500);
})();