(()=>{const slider=document.querySelector("[data-premium-slider]");if(slider&&slider.dataset.featuredMode!=="catalog-links"){const slides=[...slider.querySelectorAll("[data-slide]")],dots=[...slider.querySelectorAll("[data-slide-dot]")];let current=0;const show=i=>{current=(i+slides.length)%slides.length;slides.forEach((s,n)=>{s.hidden=n!==current;s.classList.toggle("is-active",n===current)});dots.forEach((d,n)=>n===current?d.setAttribute("aria-current","true"):d.removeAttribute("aria-current"))};slider.querySelector("[data-slide-prev]")?.addEventListener("click",()=>show(current-1));slider.querySelector("[data-slide-next]")?.addEventListener("click",()=>show(current+1));dots.forEach((d,i)=>d.addEventListener("click",()=>show(i)));let timer;if(!matchMedia("(prefers-reduced-motion: reduce)").matches){timer=setInterval(()=>show(current+1),8500);slider.addEventListener("pointerenter",()=>clearInterval(timer),{once:true})}}
const panel=document.querySelector("#premium-ai-panel"),toggles=[...document.querySelectorAll("[data-premium-ai-toggle],[data-premium-ai-open]")],backdrop=document.querySelector(".premium-ai-backdrop");const setOpen=open=>{if(!panel||!toggles.length)return;panel.classList.toggle("is-open",open);panel.setAttribute("aria-hidden",String(!open));toggles.forEach(toggle=>toggle.setAttribute("aria-expanded",String(open)));document.body.classList.toggle("premium-ai-open",open);if(backdrop)backdrop.hidden=!open;if(open)setTimeout(()=>panel.querySelector("textarea,input")?.focus(),80)};toggles.forEach(toggle=>toggle.addEventListener("click",()=>setOpen(true)));document.querySelectorAll("[data-premium-ai-close]").forEach(x=>x.addEventListener("click",()=>setOpen(false)));document.addEventListener("keydown",e=>{if(e.key==="Escape")setOpen(false)});
const search=document.querySelector(".premium-intent-search");search?.addEventListener("submit",e=>{const q=search.querySelector("input")?.value.trim();if(!q){e.preventDefault();search.querySelector("input")?.focus()}});

// Keep quick access without covering another mobile action or the inline assistant.
const floating=document.querySelector('.premium-ai-orb');
if(floating){
 const mobile=matchMedia('(max-width:820px)');let queued=false;
 function updateFloatingVisibility(){
  queued=false;const box=floating.getBoundingClientRect(),showcase=document.querySelector('.premium-ai-showcase');
  const inline=showcase?.getBoundingClientRect();
  const inlineVisible=showcase&&getComputedStyle(showcase).display!=='none'&&inline.bottom>0&&inline.top<innerHeight;
  const overlap=mobile.matches&&[...document.querySelectorAll('main a,main button,main input,main summary,footer a,footer button')].some(node=>{
   if(node===floating||node.contains(floating)||!node.getClientRects().length||getComputedStyle(node).visibility==='hidden')return false;
   const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&r.left<box.right&&r.right>box.left&&r.top<box.bottom&&r.bottom>box.top;
  });
  const panelOpen=document.body.classList.contains('premium-ai-open');
  const blocked=mobile.matches&&(panelOpen||((inlineVisible||overlap)&&document.activeElement!==floating));
  floating.dataset.mobileOccluded=String(Boolean(blocked));
  floating.setAttribute('aria-hidden',String(Boolean(blocked)));
 }
 const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(updateFloatingVisibility);}};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});document.addEventListener('click',schedule,{passive:true});document.addEventListener('focusout',schedule);mobile.addEventListener('change',schedule);
 document.fonts?.ready.then(schedule);schedule();
}

})();