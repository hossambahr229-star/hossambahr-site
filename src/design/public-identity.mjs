import {HB_IDENTITY} from './brand-system.mjs';
/** One public presentation layer. It has no authority over routes, eligibility, authentication or fees. */
export function publicIdentityCSS(){
 const c=HB_IDENTITY.colors,l=HB_IDENTITY.layout;
 return `/* Generated from src/design/public-identity.mjs. Preserve the approved discovery structure. */
@font-face{font-family:Cairo;src:url('/assets/fonts/cairo-400.ttf') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:Cairo;src:url('/assets/fonts/cairo-600.ttf') format('truetype');font-weight:600;font-display:swap}
@font-face{font-family:Cairo;src:url('/assets/fonts/cairo-700.ttf') format('truetype');font-weight:700;font-display:swap}
@font-face{font-family:Cairo;src:url('/assets/fonts/cairo-800.ttf') format('truetype');font-weight:800;font-display:swap}
:root{
 --hb-ui-font:Cairo,Arial,Tahoma,sans-serif;--hb-page-max:${l.maxWidth}px;--hb-page-gutter:${l.gutter}px;
 --brand-green:${c.evergreen};--brand-green-dark:${c.evergreen};--brand-green-soft:${c.greenSoft};
 --brand-gold:${c.gold};--brand-gold-muted:${c.goldSoft};--brand-ivory:${c.pearl};
 --brand-surface:${c.paper};--brand-text:${c.ink};--brand-text-muted:${c.muted};--brand-border:${c.line};
 --hb-navy:${c.evergreen};--hb-ink:${c.ink};--hb-emerald:${c.green};--hb-emerald-dark:${c.evergreen};
 --hb-gold:${c.gold};--hb-gold-soft:${c.goldSoft};--hb-pearl:${c.pearl};--hb-line:${c.line};--hb-muted:${c.muted};--hb-green:${c.evergreen};
 --radius-sm:${l.controlRadius}px;--radius-md:${l.cardRadius}px;--radius-lg:${l.cardRadius}px;
 --button-height:${l.actionHeight}px;--card-spacing:24px;--shadow-sm:0 6px 24px #073f350a;--shadow-md:0 16px 48px #073f3512;
}
html body{font-family:var(--hb-ui-font)!important;color:${c.ink};background:${c.pearl}}
html body :is(h1,h2,h3,h4,button,input,select,textarea,.site-header,.site-header a,.site-header .brand span,.site-header .brand small,.site-footer){font-family:var(--hb-ui-font)!important}
html body :is(input,select,textarea){font-size:16px}
html body .site-header{background:${c.paper};border-bottom:1px solid ${c.line};box-shadow:0 2px 12px #073f3505}
html body .site-header .brand span{font-weight:800;line-height:1.45;letter-spacing:0}
html body .site-header .brand small{font-weight:600;letter-spacing:0}
html body .desktop-nav a{font-weight:700;text-decoration-thickness:1px;text-underline-offset:5px}
html body .page-shell{max-width:var(--hb-page-max);margin-inline:auto}
html body :is(.service-detail,.discovery-grid,.authority-detail,.category-detail){color:${c.ink}}
html body :is(.service-detail>section,.discovery-grid article,.canonical-card,.facts-grid .fact){border-color:${c.line};box-shadow:none}
html body :is(.service-detail p,.service-detail li){line-height:1.85}
html body :is(.service-detail h2,.discovery-grid h2){line-height:1.55}
html body .service-detail :is(.source-note,.document-note){color:${c.muted}}
html.hb-phase8 body[data-home-geometry]{background:${c.pearl}!important;color:${c.ink}}
html.hb-phase8 body[data-home-geometry] :is(.target-proof,.premium-final-cta .primary){background:${c.evergreen}!important}
html[lang].hb-phase8 body[data-home-geometry] .site-header .brand :is(span,small,strong),html[lang].hb-phase8 body[data-home-geometry] .site-header .desktop-nav a{font-family:var(--hb-ui-font)!important}
html.hb-phase8 body[data-home-geometry] .premium-hero-copy h1{color:${c.evergreen}!important}
html.hb-phase8 body[data-home-geometry] .home-domain-card{border-color:${c.line}!important;background:${c.paper}!important;color:${c.ink}!important}
html.hb-phase8 body[data-home-geometry] .home-domain-card small{color:${c.muted}!important}
html body :focus-visible{outline:3px solid ${c.gold};outline-offset:4px}
@media(min-width:1101px){
 html[lang].hb-phase8 body[data-home-geometry] .site-header .desktop-nav{gap:12px!important;padding-inline:0!important}
 html body .site-header .brand span{font-size:20px}
 html body .site-header .brand small{font-size:11px}
 html body .desktop-nav a{font-size:13px}
}
@media(max-width:600px){
 html body .page-shell{padding-inline:16px}
 html body .service-detail :is(p,li){font-size:16px}
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}html body :is(button,a){transition:none!important}}
`;
}
