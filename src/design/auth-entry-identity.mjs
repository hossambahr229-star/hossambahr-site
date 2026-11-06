import{HB_IDENTITY}from'./brand-system.mjs';import{publicIdentityCSS}from'./public-identity.mjs';
export function authEntryIdentityCSS(){const c=HB_IDENTITY.colors,l=HB_IDENTITY.layout;return publicIdentityCSS()+`
/* Public auth entry presentation only; form semantics and auth handlers are owned elsewhere. */
.auth-shell{max-width:var(--hb-page-max);padding-inline:clamp(16px,2vw,24px)}
.auth-grid>*{min-width:0}
.auth-panel{background:${c.paper};border:1px solid ${c.line};border-radius:${l.cardRadius}px;box-shadow:0 12px 36px #073f350a}
.auth-panel h1{font-size:clamp(24px,2.4vw,34px);line-height:1.5}
.auth-panel h2{font-size:clamp(20px,2vw,26px);line-height:1.6}
.auth-panel input{box-sizing:border-box;border-color:${c.line};border-radius:${l.controlRadius}px;min-height:${l.actionHeight}px;font-size:16px}
.auth-panel button{border-radius:${l.controlRadius}px;min-height:${l.actionHeight}px;background:${c.evergreen};line-height:1.7}
.auth-panel input:focus-visible{outline:3px solid ${c.goldSoft};outline-offset:2px;border-color:${c.gold}}
.auth-secondary-actions details{border-color:${c.line};border-radius:${l.cardRadius}px}
.auth-secondary-actions summary{min-height:${l.actionHeight}px;background:${c.pearl};color:${c.evergreen};line-height:1.7}
.auth-tabs a{min-height:44px;display:inline-flex;align-items:center}
@media(max-width:760px){.auth-grid{grid-template-columns:minmax(0,1fr)}.auth-panel{padding:20px}.auth-panel h1{font-size:26px}}
`;}
