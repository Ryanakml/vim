"use strict";(()=>{(function(){let c=document.currentScript;if(!c){console.error("Chatify: Unable to determine script element");return}let m=c.getAttribute("data-organization-id"),f=c.getAttribute("data-bot-id"),u=c.getAttribute("data-position")||"bottom-right";if(!m||!f){console.error("Chatify: Missing data-organization-id or data-bot-id attributes");return}let b="http://localhost:3001",y="chatify_visitor_id",h="chatify_visitor_id_createdAt",I="#6366f1";function P(t){let e=new Date(t);return Date.UTC(e.getUTCFullYear(),e.getUTCMonth(),e.getUTCDate()+1,0,0,0,0)}function T(t){if(!t.startsWith("visitor_"))return null;let e=t.split("_");if(e.length<3)return null;let a=Number(e[1]);return Number.isFinite(a)?a:null}function E(t,e){if(!Number.isFinite(t)||t>e)return!0;let a=P(t);return e>=a}function A(t){return`visitor_${t}_${Math.random().toString(36).substr(2,9)}`}function R(){let t=Date.now(),e=localStorage.getItem(y),a=localStorage.getItem(h),o=a?Number(a):null;if(!o&&e){let n=T(e);n&&Number.isFinite(n)&&(o=n,localStorage.setItem(h,String(o)))}if(!e||!o||E(o,t)){let n=A(t);return localStorage.setItem(y,n),localStorage.setItem(h,String(t)),n}return e}function S(t){switch(t){case"bottom-left":return{horizontal:"left",horizontalValue:"0",vertical:"bottom",verticalValue:"0"};case"top-right":return{horizontal:"right",horizontalValue:"0",vertical:"top",verticalValue:"0"};case"top-left":return{horizontal:"left",horizontalValue:"0",vertical:"top",verticalValue:"0"};case"bottom-right":default:return{horizontal:"right",horizontalValue:"0",vertical:"bottom",verticalValue:"0"}}}function _(t){switch(t){case"bottom-left":return{horizontal:"left",horizontalValue:"20px",vertical:"bottom",verticalValue:"20px"};case"top-right":return{horizontal:"right",horizontalValue:"20px",vertical:"top",verticalValue:"20px"};case"top-left":return{horizontal:"left",horizontalValue:"20px",vertical:"top",verticalValue:"20px"};case"bottom-right":default:return{horizontal:"right",horizontalValue:"20px",vertical:"bottom",verticalValue:"20px"}}}function $(t){return t.startsWith("top")?"top: 80px":"bottom: 80px"}function x(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `}function L(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `}function v(){let t=document.createElement("div");t.id=`chatify-widget-${m}`,t.setAttribute("data-chatify-widget","true");let e=S(u);t.style.setProperty("position","fixed","important"),t.style.setProperty(e.horizontal,e.horizontalValue,"important"),t.style.setProperty(e.vertical,e.verticalValue,"important"),t.style.setProperty("width","0","important"),t.style.setProperty("height","0","important"),t.style.setProperty("z-index","2147483647","important"),t.style.setProperty("pointer-events","none","important"),t.style.setProperty("margin","0","important"),t.style.setProperty("padding","0","important"),t.style.setProperty("border","0","important"),t.style.setProperty("background","transparent","important"),t.style.setProperty("box-shadow","none","important"),t.style.setProperty("outline","none","important"),t.style.setProperty("overflow","visible","important"),document.body.appendChild(t);let a=t.attachShadow({mode:"open"}),o=_(u),n=$(u),w=document.createElement("style");w.textContent=`
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
        ${n} !important;
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
    `,a.appendChild(w);let i=document.createElement("button");i.id="chatify-button",i.innerHTML=x(),i.setAttribute("aria-label","Open chat widget"),i.setAttribute("aria-expanded","false"),a.appendChild(i);let l=document.createElement("div");l.id="chatify-container";let s=document.createElement("iframe");s.id="chatify-iframe",s.src=`${b}/widget?orgId=${m}&botId=${f}&visitorId=${R()}`,s.allow="camera; microphone",s.setAttribute("loading","lazy"),s.setAttribute("title","Chatify Chat Widget"),l.appendChild(s),a.appendChild(l);let g=!1,d=I;function z(p){if(typeof p!="number"||Number.isNaN(p))return;let r=`${Math.max(0,p)}px`;l.style.setProperty("border-radius",r,"important"),s.style.setProperty("border-radius",r,"important")}function O(){g=!0,l.classList.add("active"),i.classList.add("active"),i.innerHTML=L(),i.setAttribute("aria-expanded","true"),i.setAttribute("aria-label","Close chat widget")}function C(){g=!1,l.classList.remove("active"),i.classList.remove("active"),i.innerHTML=x(),i.setAttribute("aria-expanded","false"),i.setAttribute("aria-label","Open chat widget")}function k(){g?C():O()}i.addEventListener("click",k),window.addEventListener("message",p=>{let V=new URL(b).origin;if(p.origin!==V)return;let r=p.data;r.type==="widget:close"&&C(),r.type==="widget:ready"&&r.data&&(r.data.primaryColor&&(d=r.data.primaryColor,i.style.setProperty("background",d,"important")),r.data.cornerRadius!=null&&z(r.data.cornerRadius)),r.type==="widget:config"&&r.data&&(r.data.primaryColor&&(d=r.data.primaryColor,i.style.setProperty("background",d,"important")),r.data.cornerRadius!=null&&z(r.data.cornerRadius))}),console.log("Chatify widget loaded successfully")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",v):v()})();})();
