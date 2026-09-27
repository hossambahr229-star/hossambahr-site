(() => {
  "use strict";

  if (navigator.webdriver || /HeadlessChrome|Playwright/i.test(navigator.userAgent || "")) return;

  const endpoint = "https://ngcrkuykfqmiqhsnpcrc.supabase.co/functions/v1/web-analytics";
  const sessionKey = "hb_analytics_session_v1";

  const getSessionToken = () => {
    try {
      let token = sessionStorage.getItem(sessionKey);
      if (!token) {
        token = (crypto && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
        sessionStorage.setItem(sessionKey, token);
      }
      return token;
    } catch {
      return null;
    }
  };

  const referrerHost = () => {
    try {
      return document.referrer ? new URL(document.referrer).hostname : null;
    } catch {
      return null;
    }
  };

  const campaign = new URLSearchParams(location.search);
  const basePayload = {
    path: location.pathname || "/",
    session_token: getSessionToken(),
    referrer_host: referrerHost(),
    utm_source: campaign.get("utm_source"),
    utm_medium: campaign.get("utm_medium"),
    utm_campaign: campaign.get("utm_campaign"),
  };

  const send = (eventName, targetKind = null) => {
    const payload = {
      ...basePayload,
      event_name: eventName,
      target_kind: targetKind,
    };

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  };

  const onReady = () => send("page_view");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (!anchor) return;

    if (anchor.matches("[data-commercial-cta='verified'], .service-assist-action")) {
      send("cta_click", "commercial");
      return;
    }

    if (anchor.matches("[data-government-cta='verified'], .service-official-action")) {
      send("cta_click", "government");
    }
  }, { capture: true });
})();
