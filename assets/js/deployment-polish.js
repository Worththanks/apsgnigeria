/* APSG production-readiness helper: safe runtime accessibility/performance enhancements. */
(function(){
  'use strict';
  const $all=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();}
  function slug(v){return String(v||'field').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'field';}
  function enhanceImages(){
    $all('img').forEach((img,index)=>{
      if(!img.hasAttribute('decoding')) img.setAttribute('decoding','async');
      if(index>1 && !img.hasAttribute('loading')) img.setAttribute('loading','lazy');
      if(!img.getAttribute('alt')) img.setAttribute('alt','APSG Nigeria official visual');
      if(!img.hasAttribute('width') && img.naturalWidth) img.setAttribute('width',String(img.naturalWidth));
      if(!img.hasAttribute('height') && img.naturalHeight) img.setAttribute('height',String(img.naturalHeight));
      if(!img.complete){img.addEventListener('load',()=>{if(!img.hasAttribute('width')&&img.naturalWidth)img.setAttribute('width',String(img.naturalWidth));if(!img.hasAttribute('height')&&img.naturalHeight)img.setAttribute('height',String(img.naturalHeight));},{once:true});}
    });
  }
  function enhanceLinks(){
    $all('a[target="_blank"]').forEach(a=>{const rel=new Set(String(a.getAttribute('rel')||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');a.setAttribute('rel',Array.from(rel).join(' '));});
    $all('a[href="#"]').forEach(a=>{if(!a.dataset.allowHash){a.setAttribute('role','button');a.addEventListener('click',e=>e.preventDefault());}});
  }
  function enhanceForms(){
    $all('form').forEach((form,fi)=>{
      if(!form.getAttribute('aria-label')&&!form.getAttribute('aria-labelledby')){
        const heading=form.closest('section,main,div')?.querySelector('h1,h2,h3');
        if(heading){if(!heading.id) heading.id='form-heading-'+fi; form.setAttribute('aria-labelledby',heading.id);} else form.setAttribute('aria-label','APSG form');
      }
      $all('.field',form).forEach((wrap,wi)=>{
        const label=wrap.querySelector('label');
        const control=wrap.querySelector('input,select,textarea');
        if(label&&control){
          if(!control.id) control.id=`${slug(control.name||label.textContent)}-${fi}-${wi}`;
          if(!label.getAttribute('for')) label.setAttribute('for',control.id);
          if(control.required) control.setAttribute('aria-required','true');
        }
      });
    });
  }
  function enhanceButtons(){
    $all('button').forEach((btn,i)=>{
      const text=String(btn.textContent||'').trim();
      if(!text&&!btn.getAttribute('aria-label')) btn.setAttribute('aria-label',btn.title||`APSG action ${i+1}`);
    });
  }
  function enhanceTables(){
    $all('table').forEach(table=>{
      const parent=table.parentElement;
      if(parent&&!/(table-wrap|premium-table-wrap|data-table-wrap)/.test(parent.className||'')){
        parent.classList.add('data-table-wrap');
      }
    });
  }
  function addJsonLdFallback(){
    if(document.querySelector('script[data-apsg-runtime-schema]')) return;
    const canonical=document.querySelector('link[rel="canonical"]')?.href||location.href;
    const title=document.title||'APSG Nigeria';
    const data={
      '@context':'https://schema.org','@type':'WebPage',name:title,url:canonical,isPartOf:{'@type':'WebSite',name:'APSG Nigeria',url:'https://apsgnigeria.org/'},publisher:{'@type':'Organization',name:'APC Progressive Support Group (APSG)',url:'https://apsgnigeria.org/',logo:'https://apsgnigeria.org/assets/images/logo/apsg1.png'}
    };
    const s=document.createElement('script');s.type='application/ld+json';s.dataset.apsgRuntimeSchema='true';s.textContent=JSON.stringify(data);document.head.appendChild(s);
  }
  ready(()=>{enhanceImages();enhanceLinks();enhanceForms();enhanceButtons();enhanceTables();addJsonLdFallback();});
})();
