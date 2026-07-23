'use strict';
(function(){
  const TARGET_ML=3000;
  let lastAmount=null;
  function readAmount(){
    const text=document.querySelector('#journalWaterAmount')?.textContent||'0';
    const value=Number(text.replace(/[^0-9,.-]/g,'').replace(',','.'));
    return Number.isFinite(value)?Math.max(0,Math.round(value*1000)):0;
  }
  function decorate(){
    const ring=document.querySelector('#journalWaterRing');
    if(!ring)return false;
    ring.classList.add('water-animated');
    let fill=ring.querySelector('.water-fill');
    if(!fill){
      fill=document.createElement('div');
      fill.className='water-fill';
      fill.setAttribute('aria-hidden','true');
      fill.innerHTML='<span class="water-fill-body"></span>';
      ring.prepend(fill);
    }
    const amount=readAmount();
    const level=Math.min(100,Math.max(0,amount/TARGET_ML*100));
    ring.style.setProperty('--water-level',level+'%');
    ring.classList.toggle('water-empty',amount<=0);
    ring.classList.toggle('water-started',amount>0);
    ring.classList.toggle('water-complete',amount>=TARGET_ML);
    if(lastAmount!==null&&amount!==lastAmount){
      ring.classList.remove('water-pulse');
      void ring.offsetWidth;
      ring.classList.add('water-pulse');
      window.setTimeout(()=>ring.classList.remove('water-pulse'),850);
    }
    lastAmount=amount;
    return true;
  }
  function start(){
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='water-animation.css?v=6.8.6';
    if(!document.querySelector('link[href*="water-animation.css"]'))document.head.append(link);
    decorate();
    new MutationObserver(decorate).observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
