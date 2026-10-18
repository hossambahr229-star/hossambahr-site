import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const root='diagnostics/product-evolution-2026-10-19',report={scope:'ACTUAL_BEFORE_AFTER_CHANGE',humanAcceptance:'NOT_DECLARED',note:'Difference measures intentional evolution, not reference fidelity or quality.',views:[]};
for(const lang of ['ar','en'])for(const width of [390,1440]){
 const before=root+'/before/'+lang+'-'+width+'-approvals.png',after=root+'/after/'+lang+'-'+width+'-default.png';
 const a=await sharp(before).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(after).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Viewport mismatch');
 const data=Buffer.alloc(a.data.length);let changed=0,sum=0;
 for(let i=0;i<a.data.length;i+=4){let max=0;for(let k=0;k<3;k++){const d=Math.abs(a.data[i+k]-b.data[i+k]);data[i+k]=d;sum+=d;max=Math.max(max,d);}data[i+3]=255;if(max>20)changed++;}
 await sharp(data,{raw:a.info}).png().toFile(root+'/after/'+lang+'-'+width+'-diff.png');
 const faded=await sharp(after).ensureAlpha(0.5).png().toBuffer();
 await sharp(before).composite([{input:faded,blend:'over'}]).png().toFile(root+'/after/'+lang+'-'+width+'-overlay.png');
 report.views.push({lang,width,height:a.info.height,changedPixelsOver20Percent:100*changed/(a.info.width*a.info.height),meanAbsoluteChannelDelta:sum/(a.info.width*a.info.height*3)});
}
await writeFile(root+'/after/comparison.json',JSON.stringify(report,null,2));