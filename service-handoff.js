// Resolve only the exact query shapes emitted by existing service-page AI links.
// Rows already passed jurisdiction/source checks; duplicate identities stay unresolved.
export function exactServiceHandoff(query,rows,normalize){
 const value=normalize(query),prefix=normalize('أريد أن أسأل عن')+' ';
 const arabic=value.startsWith(prefix)?value.slice(prefix.length):null;
 const candidates=rows.filter(row=>{
  if(arabic!==null)return [row.title,row.binding?.metadata?.name_en].filter(Boolean).some(title=>normalize(title)===arabic);
  const title=row.binding?.metadata?.name_en;
  return title&&[row.jurisdiction?.name_en,row.jurisdiction?.name_ar].filter(Boolean).some(region=>value===normalize(title+' in '+region));
 });
 return candidates.length===1?candidates[0]:null;
}

// Prefer the approved source attached to the current recorded review, keeping
// historical references intact. A source still under review never gains priority.
export function reviewedCatalogSource(row){const sources=row.safeSources||[],tag=row.binding?.metadata?.recorded_detail_review;if(sources[0]?.review_required)return sources[0];return (tag?sources.find(source=>!source.review_required&&source.metadata?.review_tag===tag):null)||sources[0]||null;}
