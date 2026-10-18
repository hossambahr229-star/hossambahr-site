const url='https://hossambahr.com/a-plus-plus.css';
for(let attempt=0;attempt<120;attempt++){
 const response=await fetch(url);const css=await response.text();
 if(response.ok&&css.includes('.service-aside dt{color:var(--hb-green-800)!important}')&&css.includes('.service-aside dd{color:var(--hb-ink)!important}')){console.log('Merged service-sidebar rules are present on the live CSS URL.');process.exit(0);}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
throw new Error('Merged service-sidebar CSS did not arrive within the release wait; do not claim live acceptance.');
