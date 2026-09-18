export function resolveTenantContext({ tenant, hostname = null }) {
  if (!tenant?.id || tenant.status !== "active") throw new Error("tenant unavailable");
  return {
    tenantId:tenant.id,
    tenantKey:tenant.tenantKey,
    deploymentMode:tenant.deploymentMode || "shared",
    dataResidencyRegion:tenant.dataResidencyRegion || null,
    defaultLocale:tenant.defaultLocale || "ar-AE",
    defaultCurrency:tenant.defaultCurrency || "AED",
    hostname
  };
}

export function isSovereign(context) {
  return context?.deploymentMode === "sovereign";
}

export function assertResidency(context, targetRegion) {
  if (!context?.dataResidencyRegion) return true;
  if (context.dataResidencyRegion !== targetRegion) throw new Error("data residency violation");
  return true;
}
