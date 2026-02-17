"use strict";(()=>{(function(){let m=document.currentScript;if(!m){console.error("Chatify: Unable to determine script element");return}let g=m.getAttribute("data-token"),d=m.getAttribute("data-position")||"bottom-right";if(!g){console.error("Chatify: Missing data-token attribute");return}let f=g,b="https://vim-widget.vercel.app/",y="chatify_visitor_id",u="chatify_visitor_id_createdAt",T="#6366f1";function _(t){let e=new Date(t);return Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()+1,0,0,0,0)}function E(t){if(!t.startsWith("visitor_"))return null;let e=t.split("_");if(e.length<3)return null;let n=Number(e[1]);return Number.isFinite(n)?n:null}function P(t,e){if(!Number.isFinite(t)||t>e)return!0;let n=_(t);return e>=n}function I(t){return`visitor_${t}_${Math.random().toString(36).substr(2,9)}`}function R(){let t=Date.now(),e=localStorage.getItem(y),n=localStorage.getItem(u),o=n?Number(n):null;if(!o&&e){let a=E(e);a&&Number.isFinite(a)&&(o=a,localStorage.setItem(u,String(o)))}if(!e||!o||P(o,t)){let a=I(t);return localStorage.setItem(y,a),localStorage.setItem(u,String(t)),a}return e}function k(t){switch(t){case"bottom-left":return{horizontal:"left",horizontalValue:"0",vertical:"bottom",verticalValue:"0"};case"top-right":return{horizontal:"right",horizontalValue:"0",vertical:"top",verticalValue:"0"};case"top-left":return{horizontal:"left",horizontalValue:"0",vertical:"top",verticalValue:"0"};case"bottom-right":default:return{horizontal:"right",horizontalValue:"0",vertical:"bottom",verticalValue:"0"}}}function A(t){switch(t){case"bottom-left":return{horizontal:"left",horizontalValue:"20px",vertical:"bottom",verticalValue:"20px"};case"top-right":return{horizontal:"right",horizontalValue:"20px",vertical:"top",verticalValue:"20px"};case"top-left":return{horizontal:"left",horizontalValue:"20px",vertical:"top",verticalValue:"20px"};case"bottom-right":default:return{horizontal:"right",horizontalValue:"20px",vertical:"bottom",verticalValue:"20px"}}}function L(t){return t.startsWith("top")?"top: 80px":"bottom: 80px"}function v(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `}function S(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `}function x(){let t=document.createElement("div");t.id=`chatify-widget-${f}`,t.setAttribute("data-chatify-widget","true");let e=k(d);t.style.setProperty("position","fixed","important"),t.style.setProperty(e.horizontal,e.horizontalValue,"important"),t.style.setProperty(e.vertical,e.verticalValue,"important"),t.style.setProperty("width","0","important"),t.style.setProperty("height","0","important"),t.style.setProperty("z-index","2147483647","important"),t.style.setProperty("pointer-events","none","important"),t.style.setProperty("margin","0","important"),t.style.setProperty("padding","0","important"),t.style.setProperty("border","0","important"),t.style.setProperty("background","transparent","important"),t.style.setProperty("box-shadow","none","important"),t.style.setProperty("outline","none","important"),t.style.setProperty("overflow","visible","important"),document.body.appendChild(t);let n=t.attachShadow({mode:"open"}),o=A(d),a=L(d),w=document.createElement("style");w.textContent=`
      * {
        box-sizing: border-box;
      }

      /* BUTTON: Chat toggle */
      #chatify-button {
        position: absolute !important;
        ${o.horizontal}: ${o.horizontalValue} !important;
        ${o.vertical}: ${o.verticalValue} !important;
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background: #6366f1 !important;
        border: none !important;
        cursor: pointer !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        z-index: 999999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.2s ease !important;
        color: white !important;
        outline: none !important;
        -webkit-tap-highlight-color: transparent !important;
        pointer-events: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        line-height: 0 !important;
        font-size: 0 !important;
      }

      #chatify-button:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25) !important;
      }

      #chatify-button:active {
        transform: scale(0.95) !important;
      }

      #chatify-button svg {
        width: 28px !important;
        height: 28px !important;
        transition: transform 0.3s ease !important;
        flex-shrink: 0 !important;
      }

      #chatify-button.active svg {
        transform: rotate(90deg) !important;
      }

      /* CONTAINER: Wrapper for iframe (middle layer) */
      #chatify-container {
        position: absolute !important;
        ${o.horizontal}: ${o.horizontalValue} !important;
        ${a} !important;
        width: 380px !important;
        height: 640px !important;
        max-width: calc(100vw - 20px) !important;
        max-height: calc(100vh - 110px) !important;
        background: transparent !important;
        border-radius: 16px !important;
        box-shadow: 0 8px 48px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06) !important;
        overflow: hidden !important;
        display: none !important;
        opacity: 0 !important;
        transform: translateY(12px) scale(0.97) !important;
        transition: all 0.3s ease-out !important;
        pointer-events: auto !important;
        z-index: 999998 !important;
      }

      /* CONTAINER: Open state (animated) */
      #chatify-container.active {
        display: block !important;
        opacity: 1 !important;
        transform: translateY(0) scale(1) !important;
      }

      /* IFRAME: Inside container */
      #chatify-iframe {
        width: 100% !important;
        height: 100% !important;
        border: none !important;
        color-scheme: light dark !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      @media (max-width: 480px) {
        #chatify-container {
          width: 100vw !important;
          height: 100dvh !important;
          max-width: 100vw !important;
          max-height: 100dvh !important;
          border-radius: 0 !important;
          ${o.horizontal}: 0 !important;
          ${o.vertical}: 0 !important;
          box-shadow: none !important;
        }

        #chatify-button.active {
          z-index: 9999999 !important;
        }
      }
    `,n.appendChild(w);let i=document.createElement("button");i.id="chatify-button",i.innerHTML=v(),i.setAttribute("aria-label","Open chat widget"),i.setAttribute("aria-expanded","false"),n.appendChild(i);let l=document.createElement("div");l.id="chatify-container";let s=document.createElement("iframe");s.id="chatify-iframe",s.src=`${b}/widget?token=${encodeURIComponent(f)}&visitorId=${encodeURIComponent(R())}`,s.allow="camera; microphone",s.setAttribute("loading","lazy"),s.setAttribute("title","Chatify Chat Widget"),l.appendChild(s),n.appendChild(l);let h=!1,c=T;function C(p){if(typeof p!="number"||Number.isNaN(p))return;let r=`${Math.max(0,p)}px`;l.style.setProperty("border-radius",r,"important"),s.style.setProperty("border-radius",r,"important")}function O(){h=!0,l.classList.add("active"),i.classList.add("active"),i.innerHTML=S(),i.setAttribute("aria-expanded","true"),i.setAttribute("aria-label","Close chat widget")}function V(){h=!1,l.classList.remove("active"),i.classList.remove("active"),i.innerHTML=v(),i.setAttribute("aria-expanded","false"),i.setAttribute("aria-label","Open chat widget")}function $(){h?V():O()}i.addEventListener("click",$),window.addEventListener("message",p=>{let z=new URL(b).origin;if(p.origin!==z)return;let r=p.data;r.type==="widget:close"&&V(),r.type==="widget:ready"&&r.data&&(r.data.primaryColor&&(c=r.data.primaryColor,i.style.setProperty("background",c,"important")),r.data.cornerRadius!=null&&C(r.data.cornerRadius)),r.type==="widget:config"&&r.data&&(r.data.primaryColor&&(c=r.data.primaryColor,i.style.setProperty("background",c,"important")),r.data.cornerRadius!=null&&C(r.data.cornerRadius))}),console.log("Chatify widget loaded successfully")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x()})();})();
