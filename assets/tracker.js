// Simple visitor tracker for personal use
// IMPORTANT: Set your Google Apps Script Web App URL (or any collector endpoint) below
// Example (Apps Script): https://script.google.com/macros/s/AKfycbx.../exec
const TRACKER_ENDPOINT = ""; // TODO: paste your endpoint URL here

(function () {
  try {
    // Skip if no endpoint configured
    if (!TRACKER_ENDPOINT) return;

    // Collect basic data
    const nav = navigator || {};
    const scr = screen || {};
    const loc = window.location || {};

    const payload = {
      ts: new Date().toISOString(),
      url: loc.href || null,
      referrer: document.referrer || null,
      userAgent: nav.userAgent || null,
      language: nav.language || null,
      platform: nav.platform || null,
      timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone) || null,
      screen: {
        width: scr.width || null,
        height: scr.height || null,
        pixelRatio: window.devicePixelRatio || 1
      },
      viewport: {
        innerWidth: window.innerWidth || null,
        innerHeight: window.innerHeight || null
      }
    };

    // Get IP via ipify (optional)
    fetch("https://api.ipify.org?format=json")
      .then(r => r.ok ? r.json() : null)
      .then(ipr => {
        if (ipr && ipr.ip) payload.ip = ipr.ip;
      })
      .catch(() => {})
      .finally(() => {
        // Send to collector
        fetch(TRACKER_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ action: "track", data: payload })
        }).catch(() => {});
      });
  } catch (_) {
    // swallow
  }
})();
