// JSON and streaming responses share the same current-turn context contract.
export function jurisdictionCandidates(rows: any[], jurisdiction: string | null) {
  if (!jurisdiction || jurisdiction === 'AE') return rows;
  return rows.filter(row => row.jurisdiction?.code === jurisdiction || row.jurisdiction?.code === 'AE');
}

export function responseContext(semantic: any, result: any, safeGoal: string, fallbackJurisdiction: string | null) {
  const match = result?.matches?.[0];
  return {
    active_service_id: match?.service_slug ?? semantic.active_service_id ?? null,
    last_answer_topic: result?.answer?.focus ?? semantic.last_answer_topic ?? null,
    pending_clarification: result?.answer?.fact_status === 'NEEDS_CLARIFICATION' ? result?.follow_up_questions?.[0] || null : null,
    known_facts: semantic.known_facts || {},
    jurisdiction_hint: semantic.jurisdiction || fallbackJurisdiction,
    relationship: semantic.relationship,
    relationship_group: semantic.relationship_group,
    family_members: semantic.family_members,
    subject_role: semantic.subject_role,
    entity: semantic.entity,
    service_slug: match?.service_slug ?? semantic.service_slug ?? null,
    authority_key: match?.authority?.key ?? semantic.authority_key ?? null,
    action: semantic.action,
    turn_type: semantic.turn_type,
    topic: semantic.topic,
    intent: semantic.intent,
    service_family: semantic.service_family,
    business_activity: semantic.business_activity,
    semantic_confidence: semantic.confidence,
    safe_goal: safeGoal
  };
}
