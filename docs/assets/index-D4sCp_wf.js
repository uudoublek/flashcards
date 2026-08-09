(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function n(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(r){if(r.ep)return;r.ep=!0;const o=n(r);fetch(r.href,o)}})();const k=new Map;async function V(t){if(k.has(t))return k.get(t);const e=await fetch(t);if(!e.ok)throw new Error(`加载主题失败: ${e.status}`);const n=await e.json();return k.set(t,n),n}function Z(t){const e=new Map,n="📚 全部";for(const a of t){const r=a.tags.length>0?a.tags:[n];for(const o of r)e.has(o)||e.set(o,[]),e.get(o).push(a)}return e}const S="fc";function D(t,e,n){return`${S}/${t}/${e}/${n}`}function tt(t,e,n){const a=localStorage.getItem(D(t,e,n));if(!a)return null;try{return JSON.parse(a)}catch{return null}}function et(t,e){localStorage.setItem(D(t,e.cardId,e.cardTypeId),JSON.stringify(e))}function $(t){const e=`${S}/${t}/`,n=[];for(let a=0;a<localStorage.length;a++){const r=localStorage.key(a);if(r&&r.startsWith(e)){const o=localStorage.getItem(r);if(o)try{n.push(JSON.parse(o))}catch{}}}return n}const j=`${S}-theme`;function T(){try{const t=localStorage.getItem(j);if(t==="light"||t==="dark")return t}catch{}return"light"}function nt(t){localStorage.setItem(j,t),document.documentElement.dataset.theme=t}function at(t){document.documentElement.dataset.theme=t}function L(){return new Date().toISOString().slice(0,10)}function rt(t,e){const n=new Date(t+"T00:00:00");return n.setDate(n.getDate()+e),n.toISOString().slice(0,10)}const ot={easeFactor:2.5,interval:0,reviews:0,lapses:0};function st(t,e){return{cardId:t,cardTypeId:e,...ot,nextReview:L(),lastReview:""}}function F(t,e,n,a){const o=tt(t,e,n)??st(e,n),s=L();let{easeFactor:c,interval:d,reviews:u,lapses:g}=o;switch(a){case"again":g+=1,d=1,c=Math.max(1.3,c-.2),u=0;break;case"hard":u===0?d=1:d=Math.max(1,Math.round(d*1.2)),c=Math.max(1.3,c-.15),u+=1;break;case"good":u===0?d=1:u===1?d=3:d=Math.round(d*c),u+=1;break;case"easy":u===0?d=3:d=Math.round(d*c*1.3),c+=.15,u+=1;break}const p={...o,easeFactor:Math.round(c*100)/100,interval:d,reviews:u,lapses:g,lastReview:s,nextReview:rt(s,d)};return et(t,p),p}const w=document.getElementById("app");function b(t,e="",n=""){const a=document.createElement(t);return e&&(a.className=e),n&&(a.innerHTML=n),a}function E(){w.innerHTML=""}function ct(t){E();const e=b("div","menu-container"),n=T();e.innerHTML=`
    <h1 class="app-title">📚 闪卡</h1>
    <button class="btn-theme" id="btn-theme">${n==="light"?"🌙":"☀️"}</button>
    <div class="menu-topics" id="topic-list"></div>
  `,w.appendChild(e),document.getElementById("btn-theme").addEventListener("click",J);const a=document.getElementById("topic-list");for(const r of t){const o=b("div","topic-card");o.innerHTML=`<span>${r.name}</span><span class="arrow">→</span>`,o.addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("topic-select",{detail:r}))}),a.appendChild(o)}}function J(){const t=T()==="light"?"dark":"light";nt(t),document.dispatchEvent(new CustomEvent("theme-changed"))}function dt(t,e,n){E();const a=b("div","topic-home"),r=[...new Set(t.cards.flatMap(d=>d.tags))].sort(),o=T();a.innerHTML=`
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

    ${r.length>0?`
    <div class="tag-list" id="tag-list">
      <div class="tag-header">
        <h3>标签</h3>
        <button class="btn-link" id="tag-toggle-all">全选</button>
      </div>
    </div>
    `:'<p class="subtitle" style="margin-top:8px">📚 全部卡片</p>'}
  `,w.appendChild(a);const s=mt(t.meta.id);let c=new Set(s.length?s:r);if(r.length>0){let d=function(){u.querySelectorAll(".tag-item").forEach(p=>p.remove());for(const p of r){const y=b("label","tag-item");y.innerHTML=`
          <input type="checkbox" value="${p}" ${c.has(p)?"checked":""}>
          <span>${p}</span>
        `;const I=y.querySelector("input");I.addEventListener("change",()=>{I.checked?c.add(p):c.delete(p),N(t.meta.id,[...c])}),u.appendChild(y)}};const u=document.getElementById("tag-list");d(),document.getElementById("tag-toggle-all").addEventListener("click",()=>{c.size===r.length?c.clear():c=new Set(r),N(t.meta.id,[...c]),d()})}document.getElementById("btn-back").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("nav-menu"))}),document.getElementById("btn-theme").addEventListener("click",J),document.getElementById("btn-learn-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-learn",{detail:{tags:[...c]}}))}),document.getElementById("btn-review-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-review"))}),document.getElementById("btn-browse-mode").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("start-browse",{detail:{tags:[...c]}}))})}function it(t,e,n,a){M({card:e,cardType:n,mode:"learn",progress:a,onRate:r=>{document.dispatchEvent(new CustomEvent("learn-rate",{detail:{rating:r}}))}})}function lt(t,e,n){M({card:t,cardType:e,mode:"review",progress:{done:n.done,total:n.total},onRate:a=>{document.dispatchEvent(new CustomEvent("review-rate",{detail:{rating:a}}))}})}function ut(t,e,n){M({card:t,cardType:e,mode:"browse",offset:n.index,total:n.cards.length,onPrev:()=>{document.dispatchEvent(new CustomEvent("browse-prev"))},onNext:()=>{document.dispatchEvent(new CustomEvent("browse-next"))}})}function M(t){const{card:e,cardType:n,mode:a,progress:r,offset:o,total:s,onRate:c,onPrev:d,onNext:u}=t;E();const g=b("div","card-screen");let p="";a==="learn"&&r?p=`
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
      </div>`);const y=n.front.map(m=>e.fields[m]??"").join(""),I=n.back.map(m=>e.fields[m]??"").join("");g.innerHTML=`
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
      ${c?`
        <button class="rate-btn rate-again" data-rating="again">😰<br>忘了</button>
        <button class="rate-btn rate-hard"  data-rating="hard">🤔<br>困难</button>
        <button class="rate-btn rate-good"  data-rating="good">😊<br>顺利</button>
        <button class="rate-btn rate-easy"  data-rating="easy">😎<br>简单</button>
      `:""}
      ${d?'<button class="browse-nav" id="browse-prev">← 上一张</button>':""}
      ${u?'<button class="browse-nav" id="browse-next">下一张 →</button>':""}
    </div>

    ${a!=="browse"?`
      <div class="learn-actions" id="learn-actions">
        <button class="btn btn-show" id="btn-show">显示答案</button>
      </div>`:""}
  `,w.appendChild(g);const R=document.getElementById("card-deck"),O=document.getElementById("card-actions"),H=document.getElementById("learn-actions"),P=document.getElementById("btn-show");let x=!1;function A(){x=!x,R.classList.toggle("flipped",x),x&&(O.style.display="flex",H&&(H.style.display="none"))}R.addEventListener("click",A);const G=document.getElementById("btn-close-card");G&&G.addEventListener("click",m=>{m.stopPropagation(),document.dispatchEvent(new CustomEvent("nav-topic-home"))}),P&&P.addEventListener("click",m=>{m.stopPropagation(),A()}),c&&O.querySelectorAll(".rate-btn").forEach(m=>{m.addEventListener("click",Y=>{Y.stopPropagation();const Q=m.dataset.rating;c(Q)})}),d&&document.getElementById("browse-prev").addEventListener("click",m=>{m.stopPropagation(),d()}),u&&document.getElementById("browse-next").addEventListener("click",m=>{m.stopPropagation(),u()})}function pt(t,e){E();const n=b("div","done-screen");n.innerHTML=`
    <div class="done-icon">✅</div>
    <h2>${t} 学习完成</h2>
    ${e>0?`<p>还有 ${e} 组</p>
         <button class="btn btn-primary" id="btn-next-group">下一组 →</button>`:`<p>🎉 所有标签学习完毕！</p>
         <button class="btn btn-primary" id="btn-back-home">返回</button>`}
  `,w.appendChild(n),document.getElementById(e>0?"btn-next-group":"btn-back-home").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("learn-group-done"))})}function _(){E();const t=b("div","done-screen");t.innerHTML=`
    <div class="done-icon">🎉</div>
    <h2>复习完毕</h2>
    <p>今天没有需要复习的卡片了</p>
    <button class="btn btn-primary" id="btn-back-home">返回</button>
  `,w.appendChild(t),document.getElementById("btn-back-home").addEventListener("click",()=>{document.dispatchEvent(new CustomEvent("nav-topic-home"))})}function mt(t){try{return JSON.parse(localStorage.getItem(`fc-tags-${t}`)??"[]")}catch{return[]}}function N(t,e){localStorage.setItem(`fc-tags-${t}`,JSON.stringify(e))}const q=[{id:"ultimate-geography",name:"Ultimate Geography",file:"./data/ultimate-geography.json"},{id:"multiplication-table",name:"大九九乘法表",file:"./data/multiplication-table.json"}];let l=null;function ft(){at(T());const t=window.location.hash;if(t.startsWith("#topic=")){const e=t.slice(7),n=q.find(a=>a.id===e);if(n){U(n);return}}C()}function gt(t){window.location.hash=`topic=${t}`}function ht(){history.replaceState(null,"",window.location.pathname)}function C(){ht(),l=null,ct(q)}async function U(t){gt(t.id),l=await V(t.file),v()}function v(){if(!l)return C();const t=$(l.meta.id),e=L(),n=t.filter(o=>o.nextReview<=e).length,a=new Set(t.map(o=>o.cardId)),r=l.cards.filter(o=>!a.has(o.id)).length;dt(l,r,n)}document.addEventListener("topic-select",t=>{const e=t.detail;U(e)});document.addEventListener("nav-menu",()=>C());document.addEventListener("theme-changed",()=>{l?v():C()});document.addEventListener("nav-topic-home",()=>{i=null,h=null,f=null,v()});document.addEventListener("start-learn",t=>{if(!l)return;const e=t.detail;vt(e.tags)});let i=null;function vt(t){if(!l)return;const e=Z(l.cards),a=(t.length>0?t:[...e.keys()]).filter(o=>{var s;return(((s=e.get(o))==null?void 0:s.length)??0)>0});if(a.length===0){v();return}const r=l.meta.cardTypes;i={topicId:l.meta.id,tags:t,cardTypes:r,groups:e,groupOrder:a,currentGroupIdx:0,currentCards:[],currentCardIdx:0,currentCardTypeIdx:0},z()}function z(){if(!i)return;const{groupOrder:t,currentGroupIdx:e,groups:n}=i,a=t[e],r=n.get(a),o=$(i.topicId),s=new Set(o.map(d=>d.cardId)),c=bt(r.filter(d=>!s.has(d.id)));if(c.length===0){W();return}i.currentCards=c,i.currentCardIdx=0,i.currentCardTypeIdx=0,K()}function K(){if(!i||!l)return;const{currentCards:t,currentCardIdx:e,currentCardTypeIdx:n,cardTypes:a,currentGroupIdx:r}=i;if(e>=t.length){W();return}const o=t[e],s=a[n];it({groups:i.groups,cardTypes:i.cardTypes},o,s,{group:r+1,total:t.length,card:e+1})}document.addEventListener("learn-rate",t=>{if(!i)return;const e=t.detail,{topicId:n,currentCards:a,currentCardIdx:r,currentCardTypeIdx:o,cardTypes:s}=i,c=a[r],d=s[o];F(n,c.id,d.id,e.rating);const u=o+1;u<s.length?i.currentCardTypeIdx=u:(i.currentCardTypeIdx=0,i.currentCardIdx++),K()});function W(){if(!i)return;const{groupOrder:t,currentGroupIdx:e}=i,n=t[e],a=e+1;pt(n,t.length-a),i.currentGroupIdx=a}document.addEventListener("learn-group-done",()=>{if(i){if(i.currentGroupIdx>=i.groupOrder.length){i=null,v();return}z()}});let h=null;document.addEventListener("start-review",()=>{if(!l)return;const t=$(l.meta.id),e=L(),n=t.filter(s=>s.nextReview<=e),a=new Map;for(const s of l.cards)a.set(s.id,s);const r=new Map(l.meta.cardTypes.map(s=>[s.id,s])),o=[];for(const s of n){const c=a.get(s.cardId),d=r.get(s.cardTypeId);c&&d&&o.push({card:c,cardType:d})}if(o.length===0){_();return}o.sort((s,c)=>{const d=n.find(g=>g.cardId===s.card.id&&g.cardTypeId===s.cardType.id),u=n.find(g=>g.cardId===c.card.id&&g.cardTypeId===c.cardType.id);return d.nextReview.localeCompare(u.nextReview)}),h={topicId:l.meta.id,cards:o,index:0},X()});function X(){if(!h)return;const{cards:t,index:e}=h;if(e>=t.length){h=null,_();return}const{card:n,cardType:a}=t[e];lt(n,a,{done:e,total:t.length})}document.addEventListener("review-rate",t=>{if(!h)return;const e=t.detail,{topicId:n,cards:a,index:r}=h,{card:o,cardType:s}=a[r];F(n,o.id,s.id,e.rating),h.index++,X()});let f=null;document.addEventListener("start-browse",t=>{if(!l)return;const e=t.detail,n=new Set(e.tags.length>0?e.tags:l.cards.flatMap(o=>o.tags)),a=n.size===0?l.cards:l.cards.filter(o=>o.tags.some(s=>n.has(s))),r=[];for(const o of a)for(const s of l.meta.cardTypes)r.push({card:o,cardType:s});if(r.length===0){v();return}f={cards:r,index:0},B()});function B(){if(!f)return;const{cards:t,index:e}=f;if(e>=t.length){f=null,v();return}const{card:n,cardType:a}=t[e];ut(n,a,f)}document.addEventListener("browse-prev",()=>{f&&f.index>0&&(f.index--,B())});document.addEventListener("browse-next",()=>{f&&(f.index<f.cards.length-1?(f.index++,B()):(f=null,v()))});function bt(t){const e=[...t];for(let n=e.length-1;n>0;n--){const a=Math.floor(Math.random()*(n+1));[e[n],e[a]]=[e[a],e[n]]}return e}ft();
