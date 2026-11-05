import { HB_IDENTITY, socialPresentation } from './brand-system.mjs';
import { emirateEnglish } from '../publication/english-catalog.mjs';

const escape = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;');
const operation = {
  start: { ar:'بدء المعاملة', en:'Start your transaction' },
  renew: { ar:'تجديد', en:'Renewal' },
  cancel: { ar:'إلغاء', en:'Cancellation' },
  amend: { ar:'تعديل وتحديث', en:'Amendment' },
  extend: { ar:'تمديد', en:'Extension' },
  guide: { ar:'اعرف معاملتك', en:'Find your transaction' },
};
const rect = (x,y,w,h,r=16,fill='#fff') => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+fill+'"/>';
const path = (d,color='#0b5c48',width=7) => '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
const circle = (x,y,r,fill='#e7f1eb') => '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"/>';
const paper = () => rect(93,60,214,280,22)+path('M132 119H250M132 153H264M132 187H238M132 221H220','#b8cfc3',9);

export function serviceIllustration(symbol, accent, intent = 'guide', variant = 0) {
  const green=HB_IDENTITY.colors.evergreen;
  const motifs = {
    skyline: rect(44,188,78,147,10)+rect(148,103,86,232,10)+rect(260,153,90,182,10)
      +path('M66 220H100M66 249H100M66 278H100M173 140H207M173 176H207M173 212H207M173 248H207M285 191H324M285 226H324M285 261H324',green,7)
      +path('M33 349H367',accent,9)+path('M190 85V42',accent,8),
    renewal: paper()+circle(280,272,71,'#e7f1eb')
      +path('M241 266A42 42 0 1 1 264 312M237 237V269H269',accent,10),
    closure: rect(54,119,292,212,24)+rect(80,82,173,52,12,'#e7f1eb')
      +path('M92 182H245M92 218H207M92 254H182','#b8cfc3',8)
      +circle(293,280,68,'#fbfaf5')+path('M267 254L319 306M319 254L267 306',accent,11),
    golden: rect(83,57,234,290,26,green)+rect(109,84,182,237,15,'#0b5c48')
      +circle(200,171,53,'#f1e5c8')+path('M200 133L211 160L238 171L211 182L200 209L189 182L162 171L189 160Z',accent,8)
      +path('M145 264H255M163 288H237','#f1e5c8',8)+path('M70 52L57 31M328 69L345 49',accent,7),
    investment: rect(64,76,262,257,24)+path('M112 271V218M164 271V185M216 271V151M268 271V116',green,20)
      +path('M91 309H309',accent,9)+path('M106 178L168 136L221 157L294 87',accent,9),
    family: circle(200,143,42,'#fff')+circle(110,183,32,'#f1e5c8')+circle(293,183,32,'#f1e5c8')
      +path('M136 294V262A64 64 0 0 1 264 262V294','#fff',33)
      +path('M61 313V283A49 49 0 0 1 117 235M339 313V283A49 49 0 0 0 283 235','#f1e5c8',25)
      +path('M85 347H315',accent,8),
    badge: rect(75,91,250,240,25)+rect(153,55,94,55,12,'#f1e5c8')
      +circle(151,176,35,'#e7f1eb')+path('M111 244A41 41 0 0 1 192 244',green,13)
      +path('M221 166H286M221 202H282M112 282H283',accent,9),
    registry: rect(52,97,297,239,22)+rect(70,66,121,52,12,'#f1e5c8')
      +path('M104 175L200 130L296 175M120 190V281M173 190V281M227 190V281M280 190V281M102 299H298',green,9),
    network: circle(200,200,65,'#fff')
      +path('M200 66V122M318 136L265 166M318 268L266 236M200 334V275M82 268L132 238M82 136L135 166','#f1e5c8',9)
      +circle(200,55,30,'#f1e5c8')+circle(327,130,30,'#fff')+circle(327,276,30,'#f1e5c8')
      +circle(200,345,30,'#fff')+circle(73,276,30,'#fff')+circle(73,130,30,'#f1e5c8')
      +path('M173 201L192 220L228 181',green,10),
    certificate: rect(61,74,278,246,20)+rect(80,93,240,207,10,'#fbfaf5')
      +path('M123 139H277M111 175H289M135 211H265',green,9)
      +circle(257,281,43,'#f1e5c8')+path('M238 315L225 360L257 345L285 360L277 317',accent,10),
    travel: rect(79,58,224,287,26,green)+circle(191,158,57,'#e7f1eb')
      +path('M141 158H241M191 106V210M169 108C145 150 146 172 169 208M214 108C238 150 238 172 214 208',green,5)
      +path('M126 265H251M146 292H229','#f1e5c8',8)+path('M293 212L351 174L323 230L302 229L293 212',accent,8),
    property: rect(71,167,258,177,18)+path('M52 173L200 59L348 173',green,18)
      +rect(170,251,60,93,8,'#e7f1eb')+rect(101,210,43,49,7,'#f1e5c8')+rect(256,210,43,49,7,'#f1e5c8'),
    ledger: paper()+path('M138 271H165M185 271H212M232 271H259',accent,12)
      +circle(303,109,49,'#f1e5c8')+path('M287 109H319M303 93V125',green,8),
    balance: rect(57,294,286,43,12)+path('M200 76V290M102 124H298M102 124L63 227H141L102 124M298 124L259 227H337L298 124',green,10)
      +circle(200,67,22,'#f1e5c8')+path('M66 232Q102 265 138 232M262 232Q298 265 334 232',accent,9),
    identity: rect(48,103,304,208,25)+circle(130,177,34,'#e7f1eb')
      +path('M88 254A44 44 0 0 1 173 254',green,12)+path('M213 157H309M213 195H309M213 233H279',accent,9),
    health: rect(75,102,250,240,25)+rect(144,56,112,69,14,'#f1e5c8')
      +path('M179 89H221M200 69V109',green,9)+path('M119 170H153M119 210H153M247 170H281M247 210H281',green,8)+rect(173,242,54,100,7,'#e7f1eb'),
    mobility: rect(46,138,223,150,20)+path('M269 184H319L358 234V288H269',green,9)
      +circle(112,300,31,'#f1e5c8')+circle(303,300,31,'#f1e5c8')
      +path('M86 95H239M115 59H269',accent,9),
  };
  const emblems = {cancel:'M310 302L342 334M342 302L310 334',renew:'M309 318A17 17 0 1 1 320 335M308 303V319H324',amend:'M309 335L314 319L336 297L346 307L324 329L309 335',extend:'M309 318H343M332 306L344 318L332 330',start:'M309 318H343M326 301V335'};
  const emblem = emblems[intent] ? circle(326,318,35,accent)+path(emblems[intent],'#fff',5) : '';
  const variation = variant===1 ? path('M38 79H83M61 56V102','#ffffff20',5) : variant===2 ? circle(330,66,20,'#f1e5c830')+path('M45 329H85','#ffffff30',6) : '';
  return '<svg viewBox="0 0 400 400" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'
    +circle(200,200,181,'#ffffff10')+circle(200,200,149,'#ffffff08')
    +(motifs[symbol] || motifs.network)+variation+emblem+'</svg>';
}

export function renderServiceSocialCard(service, locale, assets) {
  if (!['ar','en'].includes(locale)) throw Error('Unsupported social locale');
  const p=socialPresentation(service),c=HB_IDENTITY.colors,en=locale==='en';
  const title=service.name?.[locale] || service.name?.en || service.name?.ar;
  if (!title) throw Error('A published service title is required');
  const scope=en?emirateEnglish(service.emirate):service.emirate;
  const intent=operation[p.guidance?'guide':p.intent][locale];
  const dark=p.layout==='document'||p.layout==='orbit';
  const background=dark?c.evergreen:c.pearl,ink=dark?c.pearl:c.ink;
  const fontFace='@font-face{font-family:HBCard;src:url('+assets.font600+') format("truetype");font-weight:600}'
    +'@font-face{font-family:HBCard;src:url('+assets.font800+') format("truetype");font-weight:800}';
  const css=fontFace+'*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;overflow:hidden}'
    +'body{font-family:HBCard,sans-serif;color:'+ink+';background:'+background+'}'
    +'.card{position:relative;width:1200px;height:630px;padding:42px 52px 34px;isolation:isolate}'
    +'.brand{height:64px;display:flex;align-items:center;gap:14px;direction:ltr}'
    +'.brand img{width:58px;height:58px}.brand strong{font-size:23px;letter-spacing:1.3px;font-weight:800}'
    +'.brand small{display:block;font-size:14px;letter-spacing:.4px;opacity:.76}'
    +'.content{height:404px;display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:32px;align-items:center;direction:'+(en?'ltr':'rtl')+'}'
    +'.copy{min-width:0;position:relative;z-index:2}.family{font-size:21px;font-weight:600;color:'+(dark?c.goldSoft:c.green)+';margin:0 0 15px}'
    +'h1{margin:0;font-size:'+(en?52:57)+'px;font-weight:800;line-height:'+(en?1.32:1.48)+';overflow-wrap:break-word}'
    +'.intent{display:inline-flex;align-items:center;gap:10px;font-size:19px;margin-top:20px}'
    +'.intent:before{content:"";width:26px;height:3px;background:'+p.accent+'}'
    +'.art{width:100%;max-width:390px;position:relative;z-index:1}.art svg{display:block;width:100%;height:auto}'
    +'.footer{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;border-top:1px solid '+(dark?'#ffffff30':c.line)+';padding-top:18px;direction:'+(en?'ltr':'rtl')+'}'
    +'.scope{font-size:19px;font-weight:800;max-width:790px;line-height:1.4}.independent{font-size:14px;white-space:nowrap;opacity:.7}'
    +'.layout-architecture:before{content:"";position:absolute;z-index:-1;inset:124px 0 105px 760px;background:'+c.greenSoft+';border-radius:48px 0 0 48px}'
    +'.layout-architecture:lang(ar):before{inset:124px 760px 105px 0;border-radius:0 48px 48px 0}'
    +'.layout-architecture .art{background:'+c.evergreen+';border-radius:28px;padding:10px}'
    +'.layout-people .art{background:'+c.green+';border-radius:48% 48% 24px 24px;padding:10px}'
    +'.layout-people:before{content:"";position:absolute;z-index:-1;width:440px;height:440px;border:1px solid '+c.line+';border-radius:50%;inset:118px 44px auto auto}'
    +'.layout-people:lang(ar):before{inset:118px auto auto 44px}'
    +'.layout-orbit:before{content:"";position:absolute;z-index:-1;width:610px;height:610px;border:52px solid #ffffff08;border-radius:50%;inset:42px -60px auto auto}'
    +'.layout-orbit:lang(ar):before{inset:42px auto auto -60px}'
    +'.variant-1.layout-architecture .art{border-radius:44px 14px 44px 14px}.variant-2.layout-architecture .art{border-radius:78px 78px 20px 20px}'
    +'.layout-document:before{content:"";position:absolute;z-index:-1;inset:0;background:linear-gradient(125deg,transparent 52%,#ffffff08 52%)}';
  return '<!doctype html><html lang="'+locale+'" dir="'+(en?'ltr':'rtl')+'"><head><meta charset="utf-8">'
    +'<meta name="viewport" content="width=1200"><style>'+css+'</style></head><body><article class="card layout-'+p.layout+' variant-'+p.variant+'">'
    +'<header class="brand"><img src="'+escape(assets.logo)+'" alt=""><div><strong>HOSSAM BAHR</strong><small>'
    +(en?'UAE TRANSACTIONS GUIDE':'دليل معاملات الإمارات')+'</small></div></header>'
    +'<div class="content"><div class="copy"><p class="family">'+escape(p.label[locale])+'</p><h1>'+escape(title)+'</h1>'
    +'<div class="intent">'+escape(intent)+'</div></div><div class="art">'+serviceIllustration(p.symbol,p.accent,p.intent,p.variant)+'</div></div>'
    +'<footer class="footer"><div class="scope">'+escape(scope)+'</div><div class="independent">'
    +(en?'Independent service platform':'منصة خدمات مستقلة')+'</div></footer></article></body></html>';
}
