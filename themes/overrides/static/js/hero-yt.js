'use strict';
(function(){
  function fitCover(target, iframe){
    if(!target || !iframe) return;
    var cw=target.clientWidth||window.innerWidth;
    var ch=target.clientHeight||window.innerHeight;
    var r=16/9, cr=cw/ch;
    if(cr>r){ iframe.style.width=cw+'px'; iframe.style.height=(cw/r)+'px'; }
    else { iframe.style.height=ch+'px'; iframe.style.width=(ch*r)+'px'; }
    iframe.style.position='absolute';
    iframe.style.top='50%';
    iframe.style.left='50%';
    iframe.style.transform='translate(-50%,-50%)';
  }
  function setup(root){
    var target=root.querySelector('[data-hero-yt-target]');
    var btn=root.querySelector('[data-hero-yt-play]');
    if(!target || !btn) return;
    var id=target.getAttribute('data-yt-id');
    function load(){
      if(target.getAttribute('data-loaded')) return;
      target.setAttribute('data-loaded','true');
      var shade=root.querySelector('[data-hero-overlay]');
      if(shade) shade.style.opacity='0';
      btn.style.display='none';
      var iframe=document.createElement('iframe');
      iframe.setAttribute('allowfullscreen','');
      iframe.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.referrerPolicy='strict-origin-when-cross-origin';
      iframe.setAttribute('loading','lazy');
      iframe.setAttribute('title','YouTube video player');
      iframe.setAttribute('frameborder','0');
      var origin=window.location && window.location.origin ? encodeURIComponent(window.location.origin) : '';
      iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&mute=1&rel=0&playsinline=1&enablejsapi=1&modestbranding=1'+(origin?('&origin='+origin):'');
      while(target.firstChild) target.removeChild(target.firstChild);
      target.appendChild(iframe);
      fitCover(target, iframe);
      window.addEventListener('resize', function(){ fitCover(target, iframe); });
      iframe.addEventListener('load', function(){
        try{
          iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'mute',args:[]}), '*');
          iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}), '*');
        }catch(e){}
      });
      if(window.gtag){ try{ window.gtag('event','video_play',{event_category:'engagement',event_label:id,transport_type:'beacon'}); }catch(e){} }
    }
    btn.addEventListener('click', load, { once:true });
    btn.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); load(); }});
  }
  function init(){
    var targets=document.querySelectorAll('[data-hero-yt-target]');
    targets.forEach(function(t){
      var root=t.closest('.section.hero');
      if(root) setup(root);
    });
  }
  if(document.readyState==='complete' || document.readyState==='interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
