(function(){
  const search=document.querySelector('#guideSearch'),grid=document.querySelector('#guideGrid'),count=document.querySelector('#guideCount'),rescue=document.querySelector('#guideRescue');
  if(!search||!grid)return;
  const normalize=value=>(value||'').toLowerCase().normalize('NFKD').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\u0600-\u06ff\w\s]/g,' ').replace(/\s+/g,' ').trim();
  const cards=[...grid.querySelectorAll('article')];
  search.addEventListener('input',()=>{const terms=normalize(search.value).split(' ').filter(Boolean);let visible=0;cards.forEach(card=>{const match=terms.every(term=>normalize(card.textContent).includes(term));card.hidden=!match;if(match)visible++});count.textContent=visible?`${visible} دليلاً مطابقاً`:'لا توجد نتيجة مطابقة';rescue.hidden=visible>0});
})();
