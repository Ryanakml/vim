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
  // const WIDGET_URL = "https://vim-widget.vercel.app";
  const WIDGET_URL = "http://localhost:3001"; // --- IGNORE Later ---
  const VISITOR_STORAGE_KEY = "chatify_visitor_id";
  const VISITOR_CREATED_AT_KEY = "chatify_visitor_id_createdAt";
  const DEFAULT_PRIMARY_COLOR = "#6366f1";

  function getNextUtcMidnight(timestamp: number): number {
    const date = new Date(timestamp);
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    );
  }

  function extractVisitorTimestamp(visitorId: string): number | null {
    if (!visitorId.startsWith("visitor_")) {
      return null;
    }
    const parts = visitorId.split("_");
    if (parts.length < 3) {
      return null;
    }
    const timestamp = Number(parts[1]);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  function isVisitorExpired(createdAt: number, now: number): boolean {
    if (!Number.isFinite(createdAt) || createdAt > now) {
      return true;
    }
    const expiresAt = getNextUtcMidnight(createdAt);
    return now >= expiresAt;
  }

  function generateVisitorId(now: number): string {
    return `visitor_${now}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function getVisitorId(): string {
    const now = Date.now();
    const storedVisitorId = localStorage.getItem(VISITOR_STORAGE_KEY);
    const storedCreatedAt = localStorage.getItem(VISITOR_CREATED_AT_KEY);
    let createdAt = storedCreatedAt ? Number(storedCreatedAt) : null;

    if (!createdAt && storedVisitorId) {
      const extractedTimestamp = extractVisitorTimestamp(storedVisitorId);
      if (extractedTimestamp && Number.isFinite(extractedTimestamp)) {
        createdAt = extractedTimestamp;
        localStorage.setItem(VISITOR_CREATED_AT_KEY, String(createdAt));
      }
    }

    if (!storedVisitorId || !createdAt || isVisitorExpired(createdAt, now)) {
      const newVisitorId = generateVisitorId(now);
      localStorage.setItem(VISITOR_STORAGE_KEY, newVisitorId);
      localStorage.setItem(VISITOR_CREATED_AT_KEY, String(now));
      return newVisitorId;
    }

    return storedVisitorId;
  }

  /**
   * Get positioning for host element (0x0 base)
   */
  function getHostPosition(pos: string): {
    horizontal: string;
    horizontalValue: string;
    vertical: string;
    verticalValue: string;
  } {
    switch (pos) {
      case "bottom-left":
        return {
          horizontal: "left",
          horizontalValue: "0",
          vertical: "bottom",
          verticalValue: "0",
        };
      case "top-right":
        return {
          horizontal: "right",
          horizontalValue: "0",
          vertical: "top",
          verticalValue: "0",
        };
      case "top-left":
        return {
          horizontal: "left",
          horizontalValue: "0",
          vertical: "top",
          verticalValue: "0",
        };
      case "bottom-right":
      default:
        return {
          horizontal: "right",
          horizontalValue: "0",
          vertical: "bottom",
          verticalValue: "0",
        };
    }
  }

  /**
   * Get positioning for button/container (absolute inside 0x0 host)
   */
  function getElementPosition(pos: string): {
    horizontal: string;
    horizontalValue: string;
    vertical: string;
    verticalValue: string;
  } {
    switch (pos) {
      case "bottom-left":
        return {
          horizontal: "left",
          horizontalValue: "20px",
          vertical: "bottom",
          verticalValue: "20px",
        };
      case "top-right":
        return {
          horizontal: "right",
          horizontalValue: "20px",
          vertical: "top",
          verticalValue: "20px",
        };
      case "top-left":
        return {
          horizontal: "left",
          horizontalValue: "20px",
          vertical: "top",
          verticalValue: "20px",
        };
      case "bottom-right":
      default:
        return {
          horizontal: "right",
          horizontalValue: "20px",
          vertical: "bottom",
          verticalValue: "20px",
        };
    }
  }

  /**
   * Get container offset position (above button)
   */
  function getContainerOffset(pos: string): string {
    const isTop = pos.startsWith("top");
    return isTop ? "top: 80px" : "bottom: 80px";
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
    // ═══════════════════════════════════════════════════════════════════
    // 1. CREATE HOST (0x0 fixed element - zero layout impact)
    // ═══════════════════════════════════════════════════════════════════
    const host = document.createElement("div");
    host.id = `chatify-widget-${organizationId}`;
    host.setAttribute("data-chatify-widget", "true");

    const hostPos = getHostPosition(position);
    host.style.setProperty("position", "fixed", "important");
    host.style.setProperty(
      hostPos.horizontal,
      hostPos.horizontalValue,
      "important",
    );
    host.style.setProperty(
      hostPos.vertical,
      hostPos.verticalValue,
      "important",
    );
    host.style.setProperty("width", "0", "important");
    host.style.setProperty("height", "0", "important");
    host.style.setProperty("z-index", "2147483647", "important");
    host.style.setProperty("pointer-events", "none", "important");

    // Defensive resets
    host.style.setProperty("margin", "0", "important");
    host.style.setProperty("padding", "0", "important");
    host.style.setProperty("border", "0", "important");
    host.style.setProperty("background", "transparent", "important");
    host.style.setProperty("box-shadow", "none", "important");
    host.style.setProperty("outline", "none", "important");
    host.style.setProperty("overflow", "visible", "important");

    document.body.appendChild(host);

    // ═══════════════════════════════════════════════════════════════════
    // 2. ATTACH SHADOW DOM
    // ═══════════════════════════════════════════════════════════════════
    const shadowRoot = host.attachShadow({ mode: "open" });

    // ═══════════════════════════════════════════════════════════════════
    // 3. INJECT CSS STYLES (with !important)
    // ═══════════════════════════════════════════════════════════════════
    const elementPos = getElementPosition(position);
    const containerOffset = getContainerOffset(position);

    const styles = document.createElement("style");
    styles.textContent = `
      * {
        box-sizing: border-box;
      }

      /* BUTTON: Chat toggle */
      #chatify-button {
        position: absolute !important;
        ${elementPos.horizontal}: ${elementPos.horizontalValue} !important;
        ${elementPos.vertical}: ${elementPos.verticalValue} !important;
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
        ${elementPos.horizontal}: ${elementPos.horizontalValue} !important;
        ${containerOffset} !important;
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
          ${elementPos.horizontal}: 0 !important;
          ${elementPos.vertical}: 0 !important;
          box-shadow: none !important;
        }

        #chatify-button.active {
          z-index: 9999999 !important;
        }
      }
    `;
    shadowRoot.appendChild(styles);

    // ═══════════════════════════════════════════════════════════════════
    // 4. CREATE BUTTON (chat toggle)
    // ═══════════════════════════════════════════════════════════════════
    const button = document.createElement("button");
    button.id = "chatify-button";
    button.innerHTML = getChatBubbleSVG();
    button.setAttribute("aria-label", "Open chat widget");
    button.setAttribute("aria-expanded", "false");
    shadowRoot.appendChild(button);

    // ═══════════════════════════════════════════════════════════════════
    // 5. CREATE CONTAINER (wrapper for iframe)
    // ═══════════════════════════════════════════════════════════════════
    const container = document.createElement("div");
    container.id = "chatify-container";

    // ═══════════════════════════════════════════════════════════════════
    // 6. CREATE IFRAME (inside container)
    // ═══════════════════════════════════════════════════════════════════
    const iframe = document.createElement("iframe");
    iframe.id = "chatify-iframe";
    iframe.src = `${WIDGET_URL}/widget?orgId=${organizationId}&botId=${botId}&visitorId=${getVisitorId()}`;
    iframe.allow = "camera; microphone";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Chatify Chat Widget");

    container.appendChild(iframe);
    shadowRoot.appendChild(container);

    // ═══════════════════════════════════════════════════════════════════
    // 7. STATE & EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════════
    let isWidgetOpen = false;
    let currentPrimaryColor = DEFAULT_PRIMARY_COLOR;

    function applyCornerRadius(cornerRadius?: number) {
      if (typeof cornerRadius !== "number" || Number.isNaN(cornerRadius)) {
        return;
      }
      const safeRadius = Math.max(0, cornerRadius);
      const radiusValue = `${safeRadius}px`;
      container.style.setProperty("border-radius", radiusValue, "important");
      iframe.style.setProperty("border-radius", radiusValue, "important");
    }

    function openWidget() {
      isWidgetOpen = true;
      container.classList.add("active");
      button.classList.add("active");
      button.innerHTML = getCloseSVG();
      button.setAttribute("aria-expanded", "true");
      button.setAttribute("aria-label", "Close chat widget");
    }

    function closeWidget() {
      isWidgetOpen = false;
      container.classList.remove("active");
      button.classList.remove("active");
      button.innerHTML = getChatBubbleSVG();
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open chat widget");
    }

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
      if (data.type === "widget:ready" && data.data) {
        if (data.data.primaryColor) {
          currentPrimaryColor = data.data.primaryColor;
          button.style.setProperty(
            "background",
            currentPrimaryColor,
            "important",
          );
        }
        if (data.data.cornerRadius != null) {
          applyCornerRadius(data.data.cornerRadius);
        }
      }

      // Handle widget config update (bot profile loaded, apply primary color and corner radius)
      if (data.type === "widget:config" && data.data) {
        // Update launcher button color
        if (data.data.primaryColor) {
          currentPrimaryColor = data.data.primaryColor;
          button.style.setProperty(
            "background",
            currentPrimaryColor,
            "important",
          );
        }

        // Apply dynamic corner radius to container and iframe
        if (data.data.cornerRadius != null) {
          applyCornerRadius(data.data.cornerRadius);
        }
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
