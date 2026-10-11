import sharp from'sharp';import{mkdir,readFile,writeFile}from'node:fs/promises';
const out='artifacts/review-latest-full-frame';await mkdir(out,{recursive:true});const report=JSON.parse(await readFile('artifacts/live-regional-visual/report.json','utf8'));
if(report.capturedAt!=='2026-10-11T12:01:14.144Z')throw Error('Unexpected original screenshot capture');
for(const name of ['production','reference'])await sharp('artifacts/live-regional-visual/'+name+'-1440.png').jpeg({quality:90,chromaSubsampling:'4:4:4'}).toFile(out+'/'+name+'-1440.jpg');
await writeFile(out+'/source.json',JSON.stringify({originalCapture:report.capturedAt,originalBranch:'agent/live-featured-type-acceptance',originalReport:'artifacts/live-regional-visual/report.json',scope:'JPEG viewing copies only; original PNGs and image differences remain authoritative.',pixelFidelity:'NOT_DECLARED'},null,2));
