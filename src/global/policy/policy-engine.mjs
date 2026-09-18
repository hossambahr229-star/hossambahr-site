export function evaluateRules({ facts = {}, rules = [] } = {}) {
  const results = [];
  for (const rule of rules) {
    const matches = (rule.when || []).every((condition) => {
      const actual = facts[condition.field];
      switch (condition.op) {
        case "eq": return actual === condition.value;
        case "neq": return actual !== condition.value;
        case "in": return Array.isArray(condition.value) && condition.value.includes(actual);
        case "exists": return condition.value ? actual != null : actual == null;
        case "gte": return Number(actual) >= Number(condition.value);
        case "lte": return Number(actual) <= Number(condition.value);
        default: return false;
      }
    });
    if (matches) {
      results.push({
        ruleId: rule.id,
        effect: rule.effect,
        reason: rule.reason || null,
        actions: rule.actions || [],
        sourceRefs: rule.sourceRefs || []
      });
    }
  }
  return results;
}

export function summarizeRuleDecision(results = []) {
  const denied = results.filter((r) => r.effect === "deny");
  const review = results.filter((r) => r.effect === "review");
  if (denied.length) return { decision: "deny", matched: denied };
  if (review.length) return { decision: "review", matched: review };
  return { decision: "allow", matched: results };
}
