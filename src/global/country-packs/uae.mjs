export const UAE_COUNTRY_PACK = Object.freeze({
  code: "AE",
  nameAr: "الإمارات العربية المتحدة",
  nameEn: "United Arab Emirates",
  currency: "AED",
  locales: ["ar-AE", "en-AE"],
  subdivisions: [
    ["AE-AZ","أبوظبي","Abu Dhabi"],
    ["AE-DU","دبي","Dubai"],
    ["AE-SH","الشارقة","Sharjah"],
    ["AE-AJ","عجمان","Ajman"],
    ["AE-RK","رأس الخيمة","Ras Al Khaimah"],
    ["AE-UQ","أم القيوين","Umm Al Quwain"],
    ["AE-FU","الفجيرة","Fujairah"]
  ].map(([code,nameAr,nameEn]) => ({code,nameAr,nameEn})),
  principles: {
    officialSourceRequiredForRegulatedFacts: true,
    governmentDecisionRemainsExternal: true,
    humanApprovalRequiredForExternalSubmission: true,
    userConsentRequiredForSensitiveDocuments: true
  }
});
