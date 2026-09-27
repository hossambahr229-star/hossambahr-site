(() => {
  "use strict";

  if (navigator.webdriver || /HeadlessChrome|Playwright/i.test(navigator.userAgent || "")) return;

  const privatePrefixes = ["/owner/", "/account/", "/auth/", "/os/"];
  if (privatePrefixes.some((prefix) => location.pathname.startsWith(prefix))) return;

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
      if (!document.referrer) return null;
      const host = new URL(document.referrer).hostname.toLowerCase();
      const currentHost = location.hostname.toLowerCase();
      if (host === currentHost || (host === "www.hossambahr.com" && currentHost === "hossambahr.com") || (host === "hossambahr.com" && currentHost === "www.hossambahr.com")) {
        return null;
      }
      return host;
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

  const classifyAnchor = (anchor) => {
    if (anchor.matches("[data-commercial-cta='verified'], .service-assist-action")) return "commercial";
    if (anchor.matches("[data-government-cta='verified'], .service-official-action")) return "government";

    const rawHref = anchor.getAttribute("href") || "";
    if (/^tel:/i.test(rawHref)) return "commercial";

    try {
      const url = new URL(anchor.href, location.href);
      const host = url.hostname.toLowerCase();
      if (host === "wa.me" || host === "api.whatsapp.com" || host === "web.whatsapp.com") return "commercial";
      if (
        host === "u.ae" ||
        host.endsWith(".gov.ae") ||
        host === "tamm.abudhabi" ||
        host.endsWith(".tamm.abudhabi") ||
        host === "invest.dubai.ae"
      ) return "government";
    } catch {
      return null;
    }

    return null;
  };

  document.addEventListener("click", (event) => {
    const anchor = event.target instanceof Element ? event.target.closest("a") : null;
    if (!anchor) return;
    const targetKind = classifyAnchor(anchor);
    if (targetKind) send("cta_click", targetKind);
  }, { capture: true });
})();
