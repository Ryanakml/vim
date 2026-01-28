"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface WebchatContextType {
  // Profile settings
  displayName: string;
  setDisplayName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  placeholder: string;
  setPlaceholder: (value: string) => void;
  primaryColor: string;
  setPrimaryColor: (value: string) => void;
  avatarUrl: string;
  setAvatarUrl: (value: string) => void;
  // Appearance settings
  font: string;
  setFont: (value: string) => void;
  themeMode: "light" | "dark";
  setThemeMode: (value: "light" | "dark") => void;
  headerStyle: "basic" | "branded";
  setHeaderStyle: (value: "basic" | "branded") => void;
  messageStyle: "filled" | "outlined";
  setMessageStyle: (value: "filled" | "outlined") => void;
  cornerRadius: number;
  setCornerRadius: (value: number) => void;
  // Feature settings
  enableFeedback: boolean;
  setEnableFeedback: (value: boolean) => void;
  enableFileUpload: boolean;
  setEnableFileUpload: (value: boolean) => void;
  enableSound: boolean;
  setEnableSound: (value: boolean) => void;
  historyReset: string;
  setHistoryReset: (value: string) => void;
}

const WebchatContext = createContext<WebchatContextType | undefined>(undefined);

export function WebchatProvider({ children }: { children: ReactNode }) {
  // Profile settings
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3276EA");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Appearance settings
  const [font, setFont] = useState("inter");
  const [themeMode, setThemeMode] = useState<"light" | "dark">("light");
  const [headerStyle, setHeaderStyle] = useState<"basic" | "branded">("basic");
  const [messageStyle, setMessageStyle] = useState<"filled" | "outlined">(
    "filled",
  );
  const [cornerRadius, setCornerRadius] = useState(16);

  // Feature settings
  const [enableFeedback, setEnableFeedback] = useState(false);
  const [enableFileUpload, setEnableFileUpload] = useState(false);
  const [enableSound, setEnableSound] = useState(false);
  const [historyReset, setHistoryReset] = useState("never");

  const value: WebchatContextType = {
    displayName,
    setDisplayName,
    description,
    setDescription,
    placeholder,
    setPlaceholder,
    primaryColor,
    setPrimaryColor,
    avatarUrl,
    setAvatarUrl,
    font,
    setFont,
    themeMode,
    setThemeMode,
    headerStyle,
    setHeaderStyle,
    messageStyle,
    setMessageStyle,
    cornerRadius,
    setCornerRadius,
    enableFeedback,
    setEnableFeedback,
    enableFileUpload,
    setEnableFileUpload,
    enableSound,
    setEnableSound,
    historyReset,
    setHistoryReset,
  };

  return (
    <WebchatContext.Provider value={value}>{children}</WebchatContext.Provider>
  );
}

export function useWebchatContext() {
  const context = useContext(WebchatContext);
  if (!context) {
    throw new Error("useWebchatContext must be used within a WebchatProvider");
  }
  return context;
}
