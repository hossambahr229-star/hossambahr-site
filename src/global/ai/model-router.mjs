const SENSITIVITY_ORDER = ["public","internal","confidential","restricted"];

export function dataClassAllowed(model, requestedClass) {
  const requested = SENSITIVITY_ORDER.indexOf(requestedClass);
  if (requested < 0) throw new Error("unknown data class");
  const allowed = new Set(model.allowedDataClasses || []);
  return allowed.has(requestedClass);
}

export function selectModel({ route, models, region = null }) {
  if (!route?.active) throw new Error("inactive AI route");
  const candidates = (route.preferredModels || [])
    .map((pref) => models.find((m) => m.provider === pref.provider && m.modelKey === pref.modelKey))
    .filter(Boolean)
    .filter((m) => m.status === "active")
    .filter((m) => (route.requiredCapabilities || []).every((cap) => (m.capabilityTags || []).includes(cap)))
    .filter((m) => dataClassAllowed(m, route.maxDataClass || "internal"))
    .filter((m) => !region || !(m.regions || []).length || m.regions.includes(region));
  if (!candidates.length) throw new Error("no compliant AI model available");
  return candidates[0];
}

export function buildModelExecutionEnvelope({ routeKey, model, purpose, dataClass, inputRefs = [] }) {
  if (!routeKey || !model || !purpose) throw new Error("invalid model execution envelope");
  return {
    routeKey,
    provider:model.provider,
    modelKey:model.modelKey,
    purpose,
    dataClass,
    inputRefs,
    createdAt:new Date().toISOString()
  };
}
