"use strict";(()=>{(function(){let s=document.currentScript;if(!s){console.error("Chatify: Unable to determine script element");return}let c=s.getAttribute("data-organization-id"),g=s.getAttribute("data-bot-id"),h=s.getAttribute("data-position")||"bottom-right";if(!c||!g){console.error("Chatify: Missing data-organization-id or data-bot-id attributes");return}let f=process.env.NEXT_PUBLIC_WIDGET_URL||"http://localhost:3001",p="chatify_visitor_id",u="#6366f1";function I(){let e=localStorage.getItem(p);return e||(e=`visitor_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,localStorage.setItem(p,e)),e}function b(e){let i={"bottom-right":"right: 20px; bottom: 20px;","bottom-left":"left: 20px; bottom: 20px;","top-right":"right: 20px; top: 20px;","top-left":"left: 20px; top: 20px;"};return i[e]||i["bottom-right"]}function L(e,i){let o=parseInt(e.replace("#",""),16),r=Math.min(255,(o>>16)+Math.round((255-(o>>16))*i/100)),d=Math.min(255,(o>>8&255)+Math.round((255-(o>>8&255))*i/100)),t=Math.min(255,(o&255)+Math.round((255-(o&255))*i/100));return`#${(r<<16|d<<8|t).toString(16).padStart(6,"0")}`}function l(e){let i=L(e,25);return`linear-gradient(135deg, ${e} 0%, ${i} 100%)`}function m(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `}function S(){return`
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `}function x(){let e=document.createElement("div");e.id=`chatify-widget-${c}`,e.setAttribute("data-chatify-widget","true"),document.body.appendChild(e);let i=e.attachShadow({mode:"open"}),o=!1,r=u,d=document.createElement("style");d.textContent=`
      * {
        box-sizing: border-box;
      }

      #chatify-button {
        position: fixed;
        ${b(h)}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${l(u)};
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
        color: white;
        outline: none;
        -webkit-tap-highlight-color: transparent;
      }

      #chatify-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      #chatify-button:active {
        transform: scale(0.95);
      }

      #chatify-button.active {
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
      }

      #chatify-button svg {
        width: 28px;
        height: 28px;
        transition: transform 0.3s ease, opacity 0.2s ease;
      }

      #chatify-button.active svg {
        transform: rotate(90deg);
      }

      #chatify-iframe {
        position: fixed;
        ${b(h)}
        width: 400px;
        height: 650px;
        border: none !important;
        border-radius: 16px;
        box-shadow: 0 8px 48px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.06);
        z-index: 999998;
        background: transparent;
        display: none;
        overflow: hidden;
        color-scheme: light dark;
      }

      #chatify-iframe.active {
        display: block;
        animation: chatifySlideIn 0.3s ease-out;
      }

      @keyframes chatifySlideIn {
        from {
          opacity: 0;
          transform: translateY(12px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @media (max-width: 480px) {
        #chatify-iframe {
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          border-radius: 0;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          box-shadow: none;
        }

        #chatify-button.active {
          z-index: 9999999;
        }
      }
    `,i.appendChild(d);let t=document.createElement("button");t.id="chatify-button",t.innerHTML=m(),t.setAttribute("aria-label","Open chat widget"),t.setAttribute("aria-expanded","false"),i.appendChild(t);let n=document.createElement("iframe");n.id="chatify-iframe",n.src=`${f}/widget?orgId=${c}&botId=${g}&visitorId=${I()}`,n.allow="camera; microphone",n.setAttribute("loading","lazy"),n.setAttribute("title","Chatify Chat Widget"),i.appendChild(n);function E(){o=!0,n.classList.add("active"),t.classList.add("active"),t.innerHTML=S(),t.setAttribute("aria-expanded","true"),t.setAttribute("aria-label","Close chat widget")}function y(){o=!1,n.classList.remove("active"),t.classList.remove("active"),t.innerHTML=m(),t.setAttribute("aria-expanded","false"),t.setAttribute("aria-label","Open chat widget")}function k(){o?y():E()}t.addEventListener("click",k),window.addEventListener("message",w=>{var v,C;let A=new URL(f).origin;if(w.origin!==A)return;let a=w.data;a.type==="widget:close"&&y(),a.type==="widget:ready"&&((v=a.data)!=null&&v.primaryColor)&&(r=a.data.primaryColor,t.style.background=l(r)),a.type==="widget:config"&&((C=a.data)!=null&&C.primaryColor)&&(r=a.data.primaryColor,t.style.background=l(r))}),console.log("Chatify widget loaded successfully")}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",x):x()})();})();
//# sourceMappingURL=embed.global.js.map