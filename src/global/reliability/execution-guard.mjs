export function makeIdempotencyKey({ actorId, operation, entityId, nonce = "" }) {
  const parts = [actorId, operation, entityId, nonce].map((x) => String(x || "").trim());
  if (parts.slice(0, 3).some((x) => !x)) throw new Error("actorId, operation and entityId are required");
  return parts.join(":");
}

export function nextRetryDelayMs(attempt, { baseMs = 1000, capMs = 15 * 60 * 1000 } = {}) {
  const n = Math.max(0, Number(attempt) || 0);
  return Math.min(capMs, baseMs * (2 ** n));
}

export function shouldDeadLetter(attempts, maxAttempts = 8) {
  return Number(attempts) >= Number(maxAttempts);
}
