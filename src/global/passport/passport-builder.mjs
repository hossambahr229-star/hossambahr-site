function verifiedCredentialIds(credentials=[]){
  return credentials
    .filter((c)=>["source_backed","cryptographically_verified","human_reviewed"].includes(c.verificationStatus))
    .filter((c)=>!c.expiresAt || new Date(c.expiresAt)>new Date())
    .map((c)=>c.id);
}

export function buildBusinessPassport({ownerUserId,subjectNodeId,business,credentials=[]}){
  if(!ownerUserId||!subjectNodeId||!business?.legalName)throw new Error("business passport requires owner, subject and legal name");
  return {
    ownerUserId,
    subjectNodeId,
    profileType:"business_passport",
    claims:{
      legalName:business.legalName,
      tradeName:business.tradeName||null,
      jurisdictionCode:business.jurisdictionCode||null,
      registrationNumber:business.registrationNumber||null
    },
    credentialRefs:verifiedCredentialIds(credentials),
    sharingMode:"private"
  };
}

export function buildEmploymentPassport({ownerUserId,subjectNodeId,employment,credentials=[]}){
  if(!ownerUserId||!subjectNodeId)throw new Error("employment passport requires owner and subject");
  return {
    ownerUserId,
    subjectNodeId,
    profileType:"employment_passport",
    claims:{
      occupation:employment?.occupation||null,
      employerName:employment?.employerName||null,
      jurisdictionCode:employment?.jurisdictionCode||null
    },
    credentialRefs:verifiedCredentialIds(credentials),
    sharingMode:"private"
  };
}

export function canSharePortableProfile(profile,now=new Date()){
  if(!profile||profile.revokedAt)return false;
  if(profile.expiresAt&&new Date(profile.expiresAt)<=now)return false;
  return profile.sharingMode!=="private";
}
