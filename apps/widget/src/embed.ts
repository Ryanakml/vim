/**
 * Chatify Widget Embed Script (IIFE)
 *
 * Customers paste this into their website:
 *
 * <script
 *   src="https://widget.chatify.app/embed.js"
 *   data-organization-id="org_abc123"
 *   data-bot-id="bot_xyz789"
 *   async
 * ></script>
 */

interface EmbedConfig {
  organizationId: string;
  botId: string;
  position: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  theme: "light" | "dark";
}

interface BotProfileResponse {
  primaryColor?: string;
  displayName?: string;
}

(function () {
  const scriptTag = document.currentScript as HTMLScriptElement | null;

  if (!scriptTag) {
    console.error("Chatify: Unable to determine script element");
    return;
  }

  const organizationId = scriptTag.getAttribute("data-organization-id");
  const botId = scriptTag.getAttribute("data-bot-id");
  const position = (scriptTag.getAttribute("data-position") ||
    "bottom-right") as EmbedConfig["position"];

  if (!organizationId || !botId) {
    console.error(
      "Chatify: Missing data-organization-id or data-bot-id attributes",
    );
    return;
  }

  // embed.ts
  const WIDGET_URL = "https://vim-widget.vercel.app";
  const VISITOR_STORAGE_KEY = "chatify_visitor_id";
  const DEFAULT_PRIMARY_COLOR = "#6366f1";

  function getVisitorId(): string {
    let visitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!visitorId) {
      visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);
    }
    return visitorId;
  }

  function getPositionCSS(pos: string): string {
    const positions: Record<string, string> = {
      "bottom-right": "right: 20px; bottom: 20px;",
      "bottom-left": "left: 20px; bottom: 20px;",
      "top-right": "right: 20px; top: 20px;",
      "top-left": "left: 20px; top: 20px;",
    };
    return positions[pos] || positions["bottom-right"];
  }

  /**
   * Lighten a hex color by a given percentage
   */
  function lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(
      255,
      (num >> 16) + Math.round(((255 - (num >> 16)) * percent) / 100),
    );
    const g = Math.min(
      255,
      ((num >> 8) & 0x00ff) +
        Math.round(((255 - ((num >> 8) & 0x00ff)) * percent) / 100),
    );
    const b = Math.min(
      255,
      (num & 0x0000ff) + Math.round(((255 - (num & 0x0000ff)) * percent) / 100),
    );
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  /**
   * Generate gradient CSS from primary color
   */
  function getButtonGradient(primaryColor: string): string {
    const lighterColor = lightenColor(primaryColor, 25);
    return `linear-gradient(135deg, ${primaryColor} 0%, ${lighterColor} 100%)`;
  }

  function getChatBubbleSVG(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
  }

  function getCloseSVG(): string {
    return `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
  }

  function initWidget() {
    const container = document.createElement("div");
    container.id = `chatify-widget-${organizationId}`;
    container.setAttribute("data-chatify-widget", "true");
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: "open" });

    let isWidgetOpen = false;
    let currentPrimaryColor = DEFAULT_PRIMARY_COLOR;

    const styles = document.createElement("style");
    styles.textContent = `
      * {
        box-sizing: border-box;
      }

      #chatify-button {
        position: fixed;
        ${getPositionCSS(position)}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${getButtonGradient(DEFAULT_PRIMARY_COLOR)};
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
        ${getPositionCSS(position)}
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
    `;
    shadowRoot.appendChild(styles);

    const button = document.createElement("button");
    button.id = "chatify-button";
    button.innerHTML = getChatBubbleSVG();
    button.setAttribute("aria-label", "Open chat widget");
    button.setAttribute("aria-expanded", "false");
    shadowRoot.appendChild(button);

    const iframe = document.createElement("iframe");
    iframe.id = "chatify-iframe";
    iframe.src = `${WIDGET_URL}/widget?orgId=${organizationId}&botId=${botId}&visitorId=${getVisitorId()}`;
    iframe.allow = "camera; microphone";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Chatify Chat Widget");
    shadowRoot.appendChild(iframe);

    /**
     * Open the widget
     */
    function openWidget() {
      isWidgetOpen = true;
      iframe.classList.add("active");
      button.classList.add("active");
      button.innerHTML = getCloseSVG();
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Close chat widget");
    }

    /**
     * Close the widget
     */
    function closeWidget() {
      isWidgetOpen = false;
      iframe.classList.remove("active");
      button.classList.remove("active");
      button.innerHTML = getChatBubbleSVG();
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open chat widget");
    }

    /**
     * Toggle widget open/close
     */
    function toggleWidget() {
      if (isWidgetOpen) {
        closeWidget();
      } else {
        openWidget();
      }
    }

    // Button click toggles widget
    button.addEventListener("click", toggleWidget);

    // Listen for postMessage from widget iframe
    window.addEventListener("message", (event) => {
      const widgetOrigin = new URL(WIDGET_URL).origin;
      if (event.origin !== widgetOrigin) {
        return;
      }

      const data = event.data;

      // Handle widget close request (from header X button)
      if (data.type === "widget:close") {
        closeWidget();
      }

      // Handle widget ready with bot config (apply dynamic color)
      if (data.type === "widget:ready" && data.data?.primaryColor) {
        currentPrimaryColor = data.data.primaryColor;
        button.style.background = getButtonGradient(currentPrimaryColor);
      }

      // Handle widget config update (bot profile loaded, apply primary color)
      if (data.type === "widget:config" && data.data?.primaryColor) {
        currentPrimaryColor = data.data.primaryColor;
        button.style.background = getButtonGradient(currentPrimaryColor);
      }
    });

    console.log("Chatify widget loaded successfully");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
