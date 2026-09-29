const SENSITIVITY_ORDER = ["public","internal","confidential","restricted"];

function field(object, camel, snake, fallback = undefined) {
  if (!object) return fallback;
  if (object[camel] !== undefined) return object[camel];
  if (object[snake] !== undefined) return object[snake];
  return fallback;
}

export function dataClassAllowed(model, requestedClass) {
  const requested = SENSITIVITY_ORDER.indexOf(requestedClass);
  if (requested < 0) throw new Error("unknown data class");
  const allowed = new Set(field(model, "allowedDataClasses", "allowed_data_classes", []));
  return allowed.has(requestedClass);
}

export function selectModel({ route, models, region = null }) {
  if (!route?.active) throw new Error("inactive AI route");
  const preferredModels = field(route, "preferredModels", "preferred_models", []);
  const requiredCapabilities = field(route, "requiredCapabilities", "required_capabilities", []);
  const maxDataClass = field(route, "maxDataClass", "max_data_class", "internal");
  const requiredRegion = region || field(route, "requireRegion", "require_region", null);

  const candidates = preferredModels
    .map((pref) => {
      const modelKey = field(pref, "modelKey", "model_key", null);
      return models.find((m) => m.provider === pref.provider && field(m, "modelKey", "model_key", null) === modelKey);
    })
    .filter(Boolean)
    .filter((m) => m.status === "active")
    .filter((m) => requiredCapabilities.every((cap) => field(m, "capabilityTags", "capability_tags", []).includes(cap)))
    .filter((m) => dataClassAllowed(m, maxDataClass))
    .filter((m) => !requiredRegion || !field(m, "regions", "regions", []).length || field(m, "regions", "regions", []).includes(requiredRegion));

  if (!candidates.length) throw new Error("no compliant AI model available");
  return candidates[0];
}

export function buildModelExecutionEnvelope({ routeKey, model, purpose, dataClass, inputRefs = [] }) {
  if (!routeKey || !model || !purpose) throw new Error("invalid model execution envelope");
  return {
    routeKey,
    provider:model.provider,
    modelKey:field(model, "modelKey", "model_key", null),
    purpose,
    dataClass,
    inputRefs,
    createdAt:new Date().toISOString()
  };
}
