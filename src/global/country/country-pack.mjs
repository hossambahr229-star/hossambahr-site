const PACK_STATUS = new Set(["draft","review","active","paused","retired"]);

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeCountryCode(value) {
  const code=String(value||"").trim().toUpperCase();
  if(!/^[A-Z]{2}$/.test(code)) throw new Error("invalid ISO country code");
  return code;
}

export function countryPackKey(countryCode) {
  return `country:${normalizeCountryCode(countryCode)}`;
}

export function validateCountryPack(pack) {
  if(!pack || typeof pack!=="object") throw new Error("country pack required");
  const code=normalizeCountryCode(pack.countryCode ?? pack.country_code);
  const packKey=pack.packKey ?? pack.pack_key;
  if(packKey!==countryPackKey(code)) throw new Error("country pack key mismatch");

  const version=Number(pack.version);
  if(!Number.isInteger(version) || version<1) throw new Error("invalid country pack version");

  const status=pack.status;
  if(!PACK_STATUS.has(status)) throw new Error("invalid country pack status");

  const locale=pack.defaultLocale ?? pack.default_locale;
  const currency=pack.defaultCurrency ?? pack.default_currency;
  const languages=pack.supportedLanguages ?? pack.supported_languages;

  if(!nonEmpty(locale)) throw new Error("default locale required");
  if(!/^[A-Z]{3}$/.test(String(currency||"").trim().toUpperCase())) throw new Error("invalid default currency");
  if(!Array.isArray(languages) || !languages.length || languages.some((x)=>!nonEmpty(x))) {
    throw new Error("supported languages required");
  }

  return {
    packKey,
    countryCode:code,
    version,
    status,
    defaultLocale:String(locale).trim(),
    defaultCurrency:String(currency).trim().toUpperCase(),
    supportedLanguages:[...new Set(languages.map((x)=>String(x).trim().toLowerCase()))]
  };
}

export function evaluateCountryPackReadiness(health) {
  const metrics=health?.metrics || {};
  const blockers={
    noAuthorities:Number(metrics.authorities_active||0)<=0,
    noServices:Number(metrics.services_active||0)<=0,
    missingAuthorities:Number(metrics.services_without_authority||0)>0,
    missingPolicies:Number(metrics.services_without_policy||0)>0,
    missingWorkflows:Number(metrics.services_without_workflow||0)>0,
    inactivePolicies:Number(metrics.services_without_active_policy||0)>0,
    inactiveWorkflows:Number(metrics.services_without_active_workflow||0)>0
  };
  const reasons=Object.entries(blockers).filter(([,blocked])=>blocked).map(([key])=>key);
  return {ready:reasons.length===0,reasons};
}

export function assertServiceCountryCompatibility({servicePackKey,requestedPackKey}) {
  if(!requestedPackKey || !servicePackKey) return true;
  if(String(servicePackKey)!==String(requestedPackKey)) {
    throw new Error("selected country conflicts with selected service");
  }
  return true;
}
