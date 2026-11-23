export const AUTHORITY_ALIASES={'sharjah-ded':'sedd-sharjah'};
export const escapeAuthority=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function authorityRecords(services,id){return services.filter(s=>s.authority.id===(AUTHORITY_ALIASES[id]||id));}
export function emptyScopeDirective(html,empty,marker){
 html=html.replace(new RegExp('<meta\\b[^>]*'+marker+'[^>]*>','gi'),'');
 return empty?html.replace('</head>','<meta name="robots" content="noindex,follow" '+marker+'></head>'):html;
}
export function retainedAuthorityLinks(original,updated){const seen=new Set(),links=[];for(const m of original.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>[\s\S]*?<\/a>/gi)){const href=m[2];if(!/^(?:https?:\/\/|\/[^/])/.test(href)||updated.includes('href="'+href+'"')||updated.includes("href='"+href+"'")||seen.has(href))continue;seen.add(href);const label=(m[0].match(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i)?.[1]||m[0].replace(/^<a\b[^>]*>/i,'').replace(/<\/a>$/i,'')).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();const opening=m[0].match(/^<a\b[^>]*>/i)[0];links.push(opening+escapeAuthority(label.replaceAll('&amp;','&'))+'</a>');}return links;}
export function authorityReleaseDates(blocks,review,origin='https://hossambahr.com'){
 if(!review)return blocks;const date=review.releaseDate;if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid authority publication date');const routes=new Set(review.pages.filter(p=>p.contentChanged&&!p.noindex&&!p.aliasTarget).map(p=>p.route));for(const p of routes)if(!/^\/(?:en\/)?authorities\/(?:[^/]+\/)?$/.test(p))throw Error('Non-authority publication route');
 return blocks.map(b=>{const loc=b.match(/<loc>([^<]+)<\/loc>/)?.[1];if(!loc)return b;const u=new URL(loc.replaceAll('&amp;','&'),origin);if(u.origin!==origin||!routes.has(decodeURIComponent(u.pathname)))return b;const prior=b.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];if(prior&&prior.slice(0,10)>=date)return b;return prior?b.replace(/<lastmod>[^<]+<\/lastmod>/,'<lastmod>'+date+'</lastmod>'):b.replace('</loc>','</loc><lastmod>'+date+'</lastmod>');});
}
