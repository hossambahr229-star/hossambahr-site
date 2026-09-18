import { requiresHumanApproval } from "../core/domain-model.mjs";

export function buildApprovalRequest({ userId, caseId = null, taskId = null, actionKey, payloadHash, requestedByType, requestedByRef = null, risk = {}, reason = null }) {
  if (!userId || !actionKey || !payloadHash || !requestedByType) throw new Error("invalid approval request");
  if (!requiresHumanApproval(risk)) return null;
  return {
    userId,
    caseId,
    taskId,
    actionKey,
    actionPayloadHash: payloadHash,
    requestedByType,
    requestedByRef,
    reason,
    status: "pending"
  };
}

export function canExecuteApproval(approval, now = new Date()) {
  if (!approval || approval.status !== "approved") return false;
  if (approval.expiresAt && new Date(approval.expiresAt) <= now) return false;
  return true;
}
