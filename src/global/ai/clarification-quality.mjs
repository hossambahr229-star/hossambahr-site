export function domesticResidenceClarification(answer){
 return /(?:العامل|العاملة|عامل|عاملة|domestic worker|domestic helper|housemaid)/i.test(answer)&&/(?:إمارة|الامارة|الإمارة|emirate)/i.test(answer);
}
