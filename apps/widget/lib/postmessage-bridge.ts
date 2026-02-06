export type WidgetMessage =
  | {
      type: "widget:ready";
      data: { sessionId: string; primaryColor?: string };
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
      data: { primaryColor: string };
    };

export function sendToParent(message: WidgetMessage) {
  if (typeof window !== "undefined" && window.parent !== window) {
    window.parent.postMessage(message, "*");
  }
}

/**
 * Notify parent that widget is ready, optionally with primary color
 */
export function notifyReady(sessionId: string, primaryColor?: string) {
  sendToParent({
    type: "widget:ready",
    data: { sessionId, primaryColor },
  });
}

/**
 * Notify parent of bot config (e.g. primary color for launcher button)
 */
export function notifyConfig(primaryColor: string) {
  sendToParent({
    type: "widget:config",
    data: { primaryColor },
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
