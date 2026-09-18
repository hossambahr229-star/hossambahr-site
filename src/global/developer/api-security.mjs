import { createHash } from "node:crypto";

export function hashApiSecret(secret){
  if(typeof secret!=="string"||secret.length<24)throw new Error("API secret too short");
  return createHash("sha256").update(secret,"utf8").digest("hex");
}

export function keyPrefix(secret,length=10){
  if(typeof secret!=="string"||secret.length<length)throw new Error("invalid secret");
  return secret.slice(0,length);
}

export function scopeAllowed(clientScopes=[],requiredScope){
  return clientScopes.includes("*")||clientScopes.includes(requiredScope);
}

export function assertWebhookUrl(value){
  const url=new URL(value);
  if(url.protocol!=="https:")throw new Error("webhook endpoint must use HTTPS");
  if(["localhost","127.0.0.1","::1"].includes(url.hostname))throw new Error("local webhook endpoints are not allowed");
  return url.toString();
}
