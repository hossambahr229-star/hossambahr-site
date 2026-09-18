export const AGENT_CONTRACTS = Object.freeze({
  intake: {
    purpose: "Turn a user's stated outcome into a structured case intake.",
    allowedScopes: ["case:read","case:draft","service:read","jurisdiction:read"],
    forbidden: ["payment:capture","government:submit","consent:grant"]
  },
  policy: {
    purpose: "Retrieve and explain policy-backed requirements using verified sources and deterministic rules.",
    allowedScopes: ["policy:read","source:read","case:read"],
    forbidden: ["policy:publish","government:submit"]
  },
  document: {
    purpose: "Classify documents, extract fields, and flag mismatches.",
    allowedScopes: ["document:read","document:extract","case:read"],
    forbidden: ["document:delete","consent:grant"]
  },
  planner: {
    purpose: "Compile an approved workflow template into executable case tasks.",
    allowedScopes: ["workflow:read","case:read","task:draft"],
    forbidden: ["task:approve","government:submit","payment:capture"]
  },
  quality: {
    purpose: "Check completeness, evidence, and contradictions before an action proceeds.",
    allowedScopes: ["case:read","task:read","document:read","audit:read"],
    forbidden: ["government:submit","payment:capture"]
  }
});

export function assertAgentScope(contractKey, requestedScope) {
  const contract = AGENT_CONTRACTS[contractKey];
  if (!contract) throw new Error("unknown agent contract");
  if (!contract.allowedScopes.includes(requestedScope)) throw new Error(`scope not allowed for ${contractKey}: ${requestedScope}`);
  return true;
}
