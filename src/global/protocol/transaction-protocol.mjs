export const ProtocolState = Object.freeze({
  REQUESTED:"requested",
  VERIFIED:"verified",
  PRICED:"priced",
  AWAITING_APPROVAL:"awaiting_approval",
  APPROVED:"approved",
  EXECUTING:"executing",
  EVIDENCED:"evidenced",
  SETTLED:"settled",
  FAILED:"failed",
  CANCELLED:"cancelled"
});

const transitions = Object.freeze({
  requested:["verified","failed","cancelled"],
  verified:["priced","failed","cancelled"],
  priced:["awaiting_approval","approved","failed","cancelled"],
  awaiting_approval:["approved","cancelled","failed"],
  approved:["executing","cancelled","failed"],
  executing:["evidenced","failed"],
  evidenced:["settled","failed"],
  settled:[],
  failed:[],
  cancelled:[]
});

export function canTransition(from,to){
  return (transitions[from]||[]).includes(to);
}

export function transition(transaction,to,{evidenceRef=null,settlementRef=null}={}){
  if(!canTransition(transaction.state,to))throw new Error(`invalid protocol transition ${transaction.state} -> ${to}`);
  const next={...transaction,state:to,updatedAt:new Date().toISOString()};
  if(evidenceRef)next.evidenceRefs=[...(transaction.evidenceRefs||[]),evidenceRef];
  if(settlementRef)next.settlementRef=settlementRef;
  return next;
}

export function protocolEnvelope({intent,idempotencyKey,tenantId=null,userId=null,organizationId=null,caseId=null,payload={}}){
  if(!intent||!idempotencyKey)throw new Error("intent and idempotencyKey required");
  return {
    protocolVersion:"1.0",
    tenantId,userId,organizationId,caseId,intent,
    state:ProtocolState.REQUESTED,
    requestPayload:payload,
    evidenceRefs:[],
    idempotencyKey
  };
}
