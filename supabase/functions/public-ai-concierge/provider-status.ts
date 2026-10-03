export function providerFailure(status: number | null, code: unknown, type: unknown = null) {
  const safe = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_.-]{1,80}$/.test(value) ? value : null;
  const c = safe(code), t = safe(type);
  const quota = ['credit_balance_exhausted','insufficient_quota','organization_spend_limit_exceeded','project_spend_limit_exceeded','organization_usage_limit_exceeded'];
  let category = 'APPLICATION_BUG';
  if (quota.includes(c || '') || quota.includes(t || '')) category = 'QUOTA_BILLING';
  else if (status === 401 || c === 'invalid_api_key') category = 'AUTHENTICATION';
  else if (status === 403 || c === 'model_not_found' || c === 'permission_denied') category = 'MODEL_ACCESS';
  else if (c === 'missing_provider' || c === 'unsupported_provider' || c === 'credit_guard_enabled') category = 'CONFIGURATION';
  else if (status === 408 || c === 'AbortError' || c === 'TimeoutError') category = 'TIMEOUT';
  else if (status === 429) category = 'RATE_LIMIT';
  else if (status !== null && status >= 500 || c === 'TypeError') category = 'NETWORK';
  return { category, status, code: c, type: t };
}

export function completedProviderText(data: any): string {
  if (data?.status !== 'completed') throw Object.assign(new Error('provider_incomplete_response'),{failure:providerFailure(200,data?.error?.code,data?.error?.type)});
  const text = String(data.output_text || (data.output || []).flatMap((o: any) => o.content || []).filter((c: any) => c.type === 'output_text').map((c: any) => c.text || '').join('')).trim();
  if (!text) throw new Error('provider_empty_response');
  return text;
}
