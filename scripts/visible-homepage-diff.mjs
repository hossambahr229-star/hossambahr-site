import sharp from 'sharp';import {readFile,writeFile} from 'node:fs/promises';
const root='diagnostics/homepage-visible-evolution-2026-10-19',rows=[];
for(const lang of ['ar','en'])for(const width of [360,390,430,1366,1440]){
 const a=await sharp(root+'/before/'+lang+'-'+width+'-home.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const b=await sharp(root+'/after/'+lang+'-'+width+'-home.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
 if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error('Viewport mismatch');
 const diff=Buffer.alloc(a.data.length),overlay=Buffer.alloc(a.data.length);let changed=0,total=0;
 for(let i=0;i<a.data.length;i+=3){let max=0;for(let k=0;k<3;k++){const v=Math.abs(a.data[i+k]-b.data[i+k]);max=Math.max(max,v);diff[i+k]=v;overlay[i+k]=Math.round((a.data[i+k]+b.data[i+k])/2);total+=v;}if(max>20)changed++;}
 const raw={width,height:a.info.height,channels:3};await sharp(diff,{raw}).png().toFile(root+'/after/'+lang+'-'+width+'-diff.png');await sharp(overlay,{raw}).png().toFile(root+'/after/'+lang+'-'+width+'-overlay.png');
 rows.push({lang,width,height:a.info.height,changedPixelsPercent:100*changed/(width*a.info.height),meanChannelDifference:total/a.data.length});
}
const before=JSON.parse(await readFile(root+'/before/report.json','utf8')),after=JSON.parse(await readFile(root+'/after/report.json','utf8'));
await writeFile(root+'/after/comparison.json',JSON.stringify({scope:'ACTUAL_BEFORE_AFTER_VISIBLE_EVOLUTION',qualityAcceptance:'NOT_DECLARED',note:'Pixel changes are evidence of changed composition, not quality or reference fidelity. Raw load timing is environment-dependent and is not a superiority benchmark.',views:rows,performance:after.views.map(v=>({lang:v.locale,width:v.width,before:before.views.find(b=>b.lang===v.locale&&b.width===v.width)?.performance,after:v.performance}))},null,2));