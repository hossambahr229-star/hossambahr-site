import { UAE_COUNTRY_PACK } from "./uae.mjs";

export function resolveUaeJurisdiction({ emirate } = {}) {
  const normalized = String(emirate || "").trim().toLowerCase();
  const aliases = new Map([
    ["abu dhabi","AE-AZ"],["abu-dhabi","AE-AZ"],["أبوظبي","AE-AZ"],
    ["dubai","AE-DU"],["دبي","AE-DU"],
    ["sharjah","AE-SH"],["الشارقة","AE-SH"],
    ["ajman","AE-AJ"],["عجمان","AE-AJ"],
    ["ras al khaimah","AE-RK"],["ras-al-khaimah","AE-RK"],["رأس الخيمة","AE-RK"],
    ["umm al quwain","AE-UQ"],["umm-al-quwain","AE-UQ"],["أم القيوين","AE-UQ"],
    ["fujairah","AE-FU"],["الفجيرة","AE-FU"]
  ]);
  const code = aliases.get(normalized);
  return UAE_COUNTRY_PACK.subdivisions.find((item) => item.code === code) || null;
}

export function buildUaeCaseContext({ emirate, serviceSlug, goal }) {
  const subdivision = resolveUaeJurisdiction({ emirate });
  return {
    countryCode: UAE_COUNTRY_PACK.code,
    jurisdictionCode: subdivision?.code || "AE",
    serviceSlug: serviceSlug || null,
    goal: goal || null,
    currency: UAE_COUNTRY_PACK.currency,
    locale: "ar-AE"
  };
}
