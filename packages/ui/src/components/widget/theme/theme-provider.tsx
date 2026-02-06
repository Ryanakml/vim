"use client";

import { createContext, useContext } from "react";
import type { BotConfig, ThemeProviderProps } from "../types.ts";

/**
 * BotThemeContext - Provides bot config to nested components
 * Allows components to access theme/config values without prop drilling
 */
const BotThemeContext = createContext<BotConfig | null>(null);

/**
 * ThemeProvider - Wraps chat components with theme configuration
 * Pure context provider - no app-specific logic
 */
export function ThemeProvider({ children, config }: ThemeProviderProps) {
  return (
    <BotThemeContext.Provider value={config}>
      {children}
    </BotThemeContext.Provider>
  );
}

/**
 * useBotTheme - Hook to access bot config in components
 * Use this to avoid prop drilling for deeply nested components
 *
 * Example:
 * const config = useBotTheme();
 * const primaryColor = config?.appearance.primaryColor;
 */
export function useBotTheme(): BotConfig | null {
  const context = useContext(BotThemeContext);
  if (!context) {
    console.warn("useBotTheme must be used within ThemeProvider");
  }
  return context;
}
