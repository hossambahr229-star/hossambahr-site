// Reuse the established conversation styles without importing legacy homepage layout.
// Every ordinary selector is rooted inside the existing assistant panel.
export function scopedAssistantCSS(source){
 const input=source.replace(/\/\*[\s\S]*?\*\//g,'');
 const splitSelectors=value=>{const parts=[];let start=0,depth=0,quote='';for(let i=0;i<value.length;i++){const c=value[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'")quote=c;else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&!depth){parts.push(value.slice(start,i));start=i+1;}}parts.push(value.slice(start));return parts;};
 const wanted=/\.hb-(?:chat|ai|conversation)[\w-]*/;
 function rules(text){let out='',pos=0;while(pos<text.length){const start=text.indexOf('{',pos);if(start<0)break;const header=text.slice(pos,start).trim();let depth=1,quote='',end=start+1;for(;end<text.length&&depth;end++){const c=text[end];if(quote){if(c==='\\')end++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'")quote=c;else if(c==='{')depth++;else if(c==='}')depth--;}
  if(depth)throw Error('Unbalanced assistant source stylesheet');const body=text.slice(start+1,end-1);pos=end;
  if(/^@(media|supports|layer|container)\b/.test(header)){const nested=rules(body);if(nested)out+=header+'{'+nested+'}\n';continue;}
  if(/^@keyframes\s+hbThink\b/.test(header)){out+=header+'{'+body+'}\n';continue;}
  if(header.startsWith('@'))continue;
  const selectors=splitSelectors(header).filter(selector=>wanted.test(selector)&&!selector.includes('.hb-ai-app-')).map(selector=>{
   selector=selector.trim().replace(/^html(?:\[[^\]]*\]|:[\w()-]+|\.[\w-]+)*\s+/,'').replace(/^body(?:\[[^\]]*\]|:[\w()-]+|\.[\w-]+)*\s*/,'').replace(/^\.premium-ai-panel\s*/,'');
   return wanted.test(selector)?'body[data-approved-home] #premium-ai-panel '+selector:null;
  }).filter(Boolean);
  if(selectors.length)out+=selectors.join(',')+'{'+body+'}\n';
 }return out;}
 const css=rules(input);if(!css.includes('.hb-chat-shell')||!css.includes('.hb-conversation-composer'))throw Error('Established assistant styles missing');return css;
}
