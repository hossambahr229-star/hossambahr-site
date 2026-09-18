export const NodeType = Object.freeze({
  PERSON: "person",
  ORGANIZATION: "organization",
  LICENSE: "license",
  REGISTRATION: "registration",
  EMPLOYEE: "employee",
  RESIDENCY: "residency",
  CREDENTIAL: "credential",
  ASSET: "asset",
  AUTHORITY: "authority",
  CASE: "case",
  DOCUMENT: "document"
});

export const RelationType = Object.freeze({
  OWNS: "owns",
  MANAGES: "manages",
  REPRESENTS: "represents",
  EMPLOYS: "employs",
  SPONSORS: "sponsors",
  HOLDS: "holds",
  ISSUED_BY: "issued_by",
  REQUIRES: "requires",
  EVIDENCES: "evidences",
  EXECUTES: "executes",
  RELATED_TO: "related_to"
});

export function graphEdge({ from, to, relation, evidenceDocumentId = null, attributes = {} }) {
  if (!from || !to || from === to) throw new Error("graph edge requires distinct nodes");
  if (!Object.values(RelationType).includes(relation)) throw new Error("unknown relation");
  return { fromNodeId: from, toNodeId: to, relationType: relation, evidenceDocumentId, attributes };
}

export function activeAt(edge, when = new Date()) {
  const t = new Date(when).getTime();
  const start = edge.validFrom ? new Date(edge.validFrom).getTime() : -Infinity;
  const end = edge.validUntil ? new Date(edge.validUntil).getTime() : Infinity;
  return t >= start && t < end;
}
