export function applySearchReleaseLastmod(blocks,review,origin='https://hossambahr.com'){
 if(!review)return{blocks:[...blocks],changed:0,preservedLater:0};
 const date=review.date;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid recorded search presentation release date');
 const reviewed=new Set(review.routes.map(route=>{const u=new URL(route,origin);if(u.origin!==origin||!/^\/(?:en\/)?services\/[^/]+\/$/.test(u.pathname))throw Error('Search release contains a non-service canonical route');return u.href;}));let changed=0,preservedLater=0;
 const output=blocks.map(block=>{const loc=block.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1];if(!loc)return block;const url=new URL(loc.replaceAll('&amp;','&'),origin).href;if(!reviewed.has(url))return block;const prior=block.match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1];if(prior&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(prior)&&prior.slice(0,10)>=date){if(prior.slice(0,10)>date)preservedLater++;return block;}changed++;return prior?block.replace(/<lastmod>[^<]*<\/lastmod>/i,'<lastmod>'+date+'</lastmod>'):block.replace(/<\/loc>/i,'</loc><lastmod>'+date+'</lastmod>');});
 return{blocks:output,changed,preservedLater};
}
