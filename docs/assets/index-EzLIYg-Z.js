(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function n(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(r){if(r.ep)return;r.ep=!0;const o=n(r);fetch(r.href,o)}})();const k=new Map;async function V(t){if(k.has(t))return k.get(t);const e=await fetch(t);if(!e.ok)throw new Error(`加载主题失败: ${e.status}`);const n=await e.json();return k.set(t,n),n}function Z(t){const e=new Map;for(const n of t)for(const a of n.tags)e.has(a)||e.set(a,[]),e.get(a).push(n);return e}const S="fc";function D(t,e,n){return`${S}/${t}/${e}/${n}`}function tt(t,e,n){const a=localStorage.getItem(D(t,e,n));if(!a)return null;try{return JSON.parse(a)}catch{return null}}function et(t,e){localStorage.setItem(D(t,e.cardId,e.cardTypeId),JSON.stringify(e))}function $(t){const e=`${S}/${t}/`,n=[];for(let a=0;a<localStorage.length;a++){const r=localStorage.key(a);if(r&&r.startsWith(e)){const o=localStorage.getItem(r);if(o)try{n.push(JSON.parse(o))}catch{}}}return n}const j=`${S}-theme`;function T(){try{const t=localStorage.getItem(j);if(t==="light"||t==="dark")return t}catch{}return"light"}function nt(t){localStorage.setItem(j,t),document.documentElement.dataset.theme=t}function at(t){document.documentElement.dataset.theme=t}function L(){return new Date().toISOString().slice(0,10)}function rt(t,e){const n=new Date(t+"T00:00:00");return n.setDate(n.getDate()+e),n.toISOString().slice(0,10)}const ot={easeFactor:2.5,interval:0,reviews:0,lapses:0};function st(t,e){return{cardId:t,cardTypeId:e,...ot,nextReview:L(),lastReview:""}}function F(t,e,n,a){const o=tt(t,e,n)??st(e,n),s=L();let{easeFactor:d,interval:c,reviews:u,lapses:m}=o;switch(a){case"again":m+=1,c=1,d=Math.max(1.3,d-.2),u=0;break;case"hard":u===0?c=1:c=Math.max(1,Math.round(c*1.2)),d=Math.max(1.3,d-.15),u+=1;break;case"good":u===0?c=1:u===1?c=3:c=Math.round(c*d),u+=1;break;case"easy":u===0?c=3:c=Math.round(c*d*1.3),d+=.15,u+=1;break}const p={...o,easeFactor:Math.round(d*100)/100,interval:c,reviews:u,lapses:m,lastReview:s,nextReview:rt(s,c)};return et(t,p),p}const w=document.getElementById("app");function v(t,e="",n=""){const a=document.createElement(t);return e&&(a.className=e),n&&(a.innerHTML=n),a}function E(){w.innerHTML=""}function ct(t){E();const e=v("div","menu-container"),n=T();e.innerHTML=`
    <h1 class="app-title">📚 闪卡</h1>
    <button class="btn-theme" id="btn-theme">${n==="light"?"🌙":"☀️"}</button>
    <div class="menu-topics" id="topic-list"></div>
  `,w.appendChild(e),document.getElementById("btn-theme").addEventListener("click",J);const a=document.getElementById("topic-list");for(const r of t){const o=v("div","topic-card");o.innerHTML=`<span>${r.name}</span><span class="arrow">→</span>`,o.addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("topic-select",{detail:r}))}),a.appendChild(o)}}function J(){const t=T()==="light"?"dark":"light";nt(t),document.dispatchEvent(new CustomEvent("theme-changed"))}function dt(t,e,n){E();const a=v("div","topic-home"),r=[...new Set(t.cards.flatMap(m=>m.tags))].sort(),o=T();a.innerHTML=`
    <button class="btn-back" id="btn-back">← 主题列表</button>
    <button class="btn-theme" id="btn-theme">${o==="light"?"🌙":"☀️"}</button>
    <h1>${t.meta.name}</h1>
    <p class="subtitle">${t.cards.length} 张卡片 · ${t.meta.cardTypes.length} 种题型</p>

    <div class="mode-buttons">
      <button class="mode-btn mode-learn" id="btn-learn-mode">
        <span class="mode-icon">🧠</span>
        <span class="mode-label">学习</span>
        <span class="mode-sub">新卡片</span>
      </button>
      <button class="mode-btn mode-review" id="btn-review-mode">
        <span class="mode-icon">🔄</span>
        <span class="mode-label">复习</span>
        <span class="mode-sub" id="review-count">${n} 张待复习</span>
      </button>
      <button class="mode-btn mode-browse" id="btn-browse-mode">
        <span class="mode-icon">📖</span>
        <span class="mode-label">浏览</span>
        <span class="mode-sub">查看全部</span>
      </button>
    </div>

    <div class="tag-list" id="tag-list">
      <div class="tag-header">
        <h3>标签</h3>
        <button class="btn-link" id="tag-toggle-all">全选</button>
      </div>
    </div>
  `,w.appendChild(a);const s=document.getElementById("tag-list"),d=mt(t.meta.id);let c=new Set(d.length?d:r);function u(){s.querySelectorAll(".tag-item").forEach(p=>p.remove());for(const p of r){const y=v("label","tag-item");y.innerHTML=`
        <input type="checkbox" value="${p}" ${c.has(p)?"checked":""}>
        <span>${p}</span>
      `;const I=y.querySelector("input");I.addEventListener("change",()=>{I.checked?c.add(p):c.delete(p),A(t.meta.id,[...c])}),s.appendChild(y)}}u(),document.getElementById("tag-toggle-all").addEventListener("click",()=>{c.size===r.length?c.clear():c=new Set(r),A(t.meta.id,[...c]),u()}),document.getElementById("btn-back").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("nav-menu"))}),document.getElementById("btn-theme").addEventListener("click",J),document.getElementById("btn-learn-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-learn",{detail:{tags:[...c]}}))}),document.getElementById("btn-review-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-review"))}),document.getElementById("btn-browse-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-browse",{detail:{tags:[...c]}}))})}function it(t,e,n,a){M({card:e,cardType:n,mode:"learn",progress:a,onRate:r=>{document.dispatchEvent(new CustomEvent("learn-rate",{detail:{rating:r}}))}})}function lt(t,e,n){M({card:t,cardType:e,mode:"review",progress:{done:n.done,total:n.total},onRate:a=>{document.dispatchEvent(new CustomEvent("review-rate",{detail:{rating:a}}))}})}function ut(t,e,n){M({card:t,cardType:e,mode:"browse",offset:n.index,total:n.cards.length,onPrev:()=>{document.dispatchEvent(new CustomEvent("browse-prev"))},onNext:()=>{document.dispatchEvent(new CustomEvent("browse-next"))}})}function M(t){const{card:e,cardType:n,mode:a,progress:r,offset:o,total:s,onRate:d,onPrev:c,onNext:u}=t;E();const m=v("div","card-screen");let p="";a==="learn"&&r?p=`
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">第 ${r.group??"?"} 组 · ${r.card??"?"}/${r.total} 卡</span>
        <span></span>
      </div>`:a==="review"&&r?p=`
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">复习 ${(r.done??0)+1}/${r.total}</span>
        <span></span>
      </div>`:a==="browse"&&o!==void 0&&s!==void 0&&(p=`
      <div class="top-bar">
        <button class="btn-close-card" id="btn-close-card">✕</button>
        <span class="progress-text">${o+1}/${s}</span>
        <span></span>
      </div>`);const y=n.front.map(f=>e.fields[f]??"").join(""),I=n.back.map(f=>e.fields[f]??"").join("");m.innerHTML=`
    ${p}
    <div class="card-deck" id="card-deck">
      <div class="card-face card-front" id="card-front">
        <div class="card-type-label">${a==="learn"?"学习":a==="review"?"复习":"浏览"}</div>
        <div class="card-tags">${e.tags.join(" · ")}</div>
        <div class="card-content">${y}</div>
        <div class="tap-hint">👆 点击翻转</div>
      </div>
      <div class="card-face card-back" id="card-back">
        <div class="card-content">${I}</div>
      </div>
    </div>

    <div class="card-actions" id="card-actions" style="display:none">
      ${d?`
        <button class="rate-btn rate-again" data-rating="again">😰<br>忘了</button>
        <button class="rate-btn rate-hard"  data-rating="hard">🤔<br>困难</button>
        <button class="rate-btn rate-good"  data-rating="good">😊<br>顺利</button>
        <button class="rate-btn rate-easy"  data-rating="easy">😎<br>简单</button>
      `:""}
      ${c?'<button class="browse-nav" id="browse-prev">← 上一张</button>':""}
      ${u?'<button class="browse-nav" id="browse-next">下一张 →</button>':""}
    </div>

    ${a!=="browse"?`
      <div class="learn-actions" id="learn-actions">
        <button class="btn btn-show" id="btn-show">显示答案</button>
      </div>`:""}
  `,w.appendChild(m);const R=document.getElementById("card-deck"),O=document.getElementById("card-actions"),H=document.getElementById("learn-actions"),P=document.getElementById("btn-show");let x=!1;function N(){x=!x,R.classList.toggle("flipped",x),x&&(O.style.display="flex",H&&(H.style.display="none"))}R.addEventListener("click",N);const G=document.getElementById("btn-close-card");G&&G.addEventListener("click",f=>{f.stopPropagation(),document.dispatchEvent(new CustomEvent("nav-topic-home"))}),P&&P.addEventListener("click",f=>{f.stopPropagation(),N()}),d&&O.querySelectorAll(".rate-btn").forEach(f=>{f.addEventListener("click",Y=>{Y.stopPropagation();const Q=f.dataset.rating;d(Q)})}),c&&document.getElementById("browse-prev").addEventListener("click",f=>{f.stopPropagation(),c()}),u&&document.getElementById("browse-next").addEventListener("click",f=>{f.stopPropagation(),u()})}function pt(t,e){E();const n=v("div","done-screen");n.innerHTML=`
    <div class="done-icon">✅</div>
    <h2>${t} 学习完成</h2>
    ${e>0?`<p>还有 ${e} 组</p>
         <button class="btn btn-primary" id="btn-next-group">下一组 →</button>`:`<p>🎉 所有标签学习完毕！</p>
         <button class="btn btn-primary" id="btn-back-home">返回</button>`}
  `,w.appendChild(n),document.getElementById(e>0?"btn-next-group":"btn-back-home").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("learn-group-done"))})}function q(){E();const t=v("div","done-screen");t.innerHTML=`
    <div class="done-icon">🎉</div>
    <h2>复习完毕</h2>
    <p>今天没有需要复习的卡片了</p>
    <button class="btn btn-primary" id="btn-back-home">返回</button>
  `,w.appendChild(t),document.getElementById("btn-back-home").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("nav-topic-home"))})}function mt(t){try{return JSON.parse(localStorage.getItem(`fc-tags-${t}`)??"[]")}catch{return[]}}function A(t,e){localStorage.setItem(`fc-tags-${t}`,JSON.stringify(e))}const _=[{id:"ultimate-geography",name:"Ultimate Geography",file:"./data/ultimate-geography.json"},{id:"multiplication-table",name:"大九九乘法表",file:"./data/multiplication-table.json"}];let l=null;function ft(){at(T());const t=window.location.hash;if(t.startsWith("#topic=")){const e=t.slice(7),n=_.find(a=>a.id===e);if(n){K(n);return}}C()}function gt(t){window.location.hash=`topic=${t}`}function ht(){history.replaceState(null,"",window.location.pathname)}function C(){ht(),l=null,ct(_)}async function K(t){gt(t.id),l=await V(t.file),b()}function b(){if(!l)return C();const t=$(l.meta.id),e=L(),n=t.filter(o=>o.nextReview<=e).length,a=new Set(t.map(o=>o.cardId)),r=l.cards.filter(o=>!a.has(o.id)).length;dt(l,r,n)}document.addEventListener("topic-select",t=>{const e=t.detail;K(e)});document.addEventListener("nav-menu",()=>C());document.addEventListener("theme-changed",()=>{l?b():C()});document.addEventListener("nav-topic-home",()=>{i=null,h=null,g=null,b()});document.addEventListener("start-learn",t=>{if(!l)return;const e=t.detail;bt(e.tags)});let i=null;function bt(t){if(!l)return;const e=Z(l.cards),n=t.filter(r=>{var o;return(((o=e.get(r))==null?void 0:o.length)??0)>0});if(n.length===0){b();return}const a=l.meta.cardTypes;i={topicId:l.meta.id,tags:t,cardTypes:a,groups:e,groupOrder:n,currentGroupIdx:0,currentCards:[],currentCardIdx:0,currentCardTypeIdx:0},U()}function U(){if(!i)return;const{groupOrder:t,currentGroupIdx:e,groups:n}=i,a=t[e],r=n.get(a),o=$(i.topicId),s=new Set(o.map(c=>c.cardId)),d=vt(r.filter(c=>!s.has(c.id)));if(d.length===0){z();return}i.currentCards=d,i.currentCardIdx=0,i.currentCardTypeIdx=0,W()}function W(){if(!i||!l)return;const{currentCards:t,currentCardIdx:e,currentCardTypeIdx:n,cardTypes:a,currentGroupIdx:r}=i;if(e>=t.length){z();return}const o=t[e],s=a[n];it({groups:i.groups,cardTypes:i.cardTypes},o,s,{group:r+1,total:t.length,card:e+1})}document.addEventListener("learn-rate",t=>{if(!i)return;const e=t.detail,{topicId:n,currentCards:a,currentCardIdx:r,currentCardTypeIdx:o,cardTypes:s}=i,d=a[r],c=s[o];F(n,d.id,c.id,e.rating);const u=o+1;u<s.length?i.currentCardTypeIdx=u:(i.currentCardTypeIdx=0,i.currentCardIdx++),W()});function z(){if(!i)return;const{groupOrder:t,currentGroupIdx:e}=i,n=t[e],a=e+1;pt(n,t.length-a),i.currentGroupIdx=a}document.addEventListener("learn-group-done",()=>{if(i){if(i.currentGroupIdx>=i.groupOrder.length){i=null,b();return}U()}});let h=null;document.addEventListener("start-review",()=>{if(!l)return;const t=$(l.meta.id),e=L(),n=t.filter(s=>s.nextReview<=e),a=new Map;for(const s of l.cards)a.set(s.id,s);const r=new Map(l.meta.cardTypes.map(s=>[s.id,s])),o=[];for(const s of n){const d=a.get(s.cardId),c=r.get(s.cardTypeId);d&&c&&o.push({card:d,cardType:c})}if(o.length===0){q();return}o.sort((s,d)=>{const c=n.find(m=>m.cardId===s.card.id&&m.cardTypeId===s.cardType.id),u=n.find(m=>m.cardId===d.card.id&&m.cardTypeId===d.cardType.id);return c.nextReview.localeCompare(u.nextReview)}),h={topicId:l.meta.id,cards:o,index:0},X()});function X(){if(!h)return;const{cards:t,index:e}=h;if(e>=t.length){h=null,q();return}const{card:n,cardType:a}=t[e];lt(n,a,{done:e,total:t.length})}document.addEventListener("review-rate",t=>{if(!h)return;const e=t.detail,{topicId:n,cards:a,index:r}=h,{card:o,cardType:s}=a[r];F(n,o.id,s.id,e.rating),h.index++,X()});let g=null;document.addEventListener("start-browse",t=>{if(!l)return;const e=t.detail,n=new Set(e.tags.length>0?e.tags:l.cards.flatMap(o=>o.tags)),a=l.cards.filter(o=>o.tags.some(s=>n.has(s))),r=[];for(const o of a)for(const s of l.meta.cardTypes)r.push({card:o,cardType:s});if(r.length===0){b();return}g={cards:r,index:0},B()});function B(){if(!g)return;const{cards:t,index:e}=g;if(e>=t.length){g=null,b();return}const{card:n,cardType:a}=t[e];ut(n,a,g)}document.addEventListener("browse-prev",()=>{g&&g.index>0&&(g.index--,B())});document.addEventListener("browse-next",()=>{g&&(g.index<g.cards.length-1?(g.index++,B()):(g=null,b()))});function vt(t){const e=[...t];for(let n=e.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[e[n],e[a]]=[e[a],e[n]]}return e}ft();
