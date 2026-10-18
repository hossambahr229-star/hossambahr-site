const pageUrl='https://hossambahr.com/services/umm-al-quwain-trade-name-official-path/';
for(let attempt=0;attempt<120;attempt++){
 const html=await (await fetch(pageUrl)).text();
 const href=[...html.matchAll(/href=["']([^"']+)["']/g)].map(x=>x[1]).find(x=>x.startsWith('/_next/static/chunks/')&&x.endsWith('.css'));
 if(!href)throw new Error('Published service stylesheet was not discoverable');
 const response=await fetch(new URL(href,pageUrl));const css=await response.text();
 if(response.ok&&css.includes('.service-aside dt{color:var(--hb-green-800)!important}')&&css.includes('.service-aside dd{color:var(--hb-ink)!important}')){console.log('Merged rules are present in the stylesheet actually referenced by the live service page: '+href);process.exit(0);}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
throw new Error('The generated stylesheet used by Production did not arrive within the release wait.');
