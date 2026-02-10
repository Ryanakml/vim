export type WidgetMessage =
  | {
      type: "widget:ready";
      data: { sessionId: string; primaryColor?: string; cornerRadius?: number };
    }
  | {
      type: "widget:close";
    }
  | {
      type: "widget:error";
      data: { message: string };
    }
  | {
      type: "widget:config";
      data: { primaryColor: string; cornerRadius?: number };
    };

export function sendToParent(message: WidgetMessage) {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage(message, "*");
  }
}

/**
 * Notify parent that widget is ready, optionally with primary color
 */
export function notifyReady(
  sessionId: string,
  primaryColor?: string,
  cornerRadius?: number,
) {
  sendToParent({
    type: "widget:ready",
    data: { sessionId, primaryColor, cornerRadius },
  });
}

/**
 * Notify parent of bot config (e.g. primary color for launcher button, corner radius)
 */
export function notifyConfig(primaryColor: string, cornerRadius?: number) {
  sendToParent({
    type: "widget:config",
    data: { primaryColor, cornerRadius },
  });
}

export function notifyClose() {
  sendToParent({ type: "widget:close" });
}

export function notifyError(message: string) {
  sendToParent({
    type: "widget:error",
    data: { message },
  });
}
