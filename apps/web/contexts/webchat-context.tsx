"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useBotProfile,
  useEnsureBotProfile,
  useUpdateBotProfile,
  type BotProfile,
} from "@/lib/convex-client";

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
  // Loading and error states
  isLoading: boolean;
  error: Error | null;
  // Save function
  saveProfile: () => Promise<void>;
}

const WebchatContext = createContext<WebchatContextType | undefined>(undefined);

export function WebchatProvider({ children }: { children: ReactNode }) {
  // ✅ Track current authenticated user to reset state when user changes
  const { userId: currentUserId } = useAuth();

  // Convex hooks
  const botProfile = useBotProfile();
  const updateBotProfile = useUpdateBotProfile();
  const ensureBotProfile = useEnsureBotProfile();

  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // ✅ Track previous user ID to detect user changes
  const [previousUserId, setPreviousUserId] = useState<string | null>(
    currentUserId || null,
  );

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

  // ✅ Reset all state when user changes (logout/login different account)
  useEffect(() => {
    if (currentUserId !== previousUserId) {
      // User has changed - reset all local state
      if (previousUserId !== null) {
        // Clear state (but not on initial mount)
        setDisplayName("");
        setDescription("");
        setPlaceholder("");
        setPrimaryColor("#3276EA");
        setAvatarUrl("");
        setFont("inter");
        setThemeMode("light");
        setHeaderStyle("basic");
        setMessageStyle("filled");
        setCornerRadius(16);
        setEnableFeedback(false);
        setEnableFileUpload(false);
        setEnableSound(false);
        setHistoryReset("never");
        setError(null);
      }
      setPreviousUserId(currentUserId ?? null);
    }
  }, [currentUserId, previousUserId]);

  // On mount: ensure bot profile exists
  useEffect(() => {
    const initProfile = async () => {
      if (!currentUserId) return;
      try {
        setIsLoading(true);
        await ensureBotProfile();
      } catch (err) {
        if (!currentUserId) return;
        setError(
          err instanceof Error ? err : new Error("Failed to load profile"),
        );
      } finally {
        setIsLoading(false);
      }
    };
    initProfile();
  }, [ensureBotProfile, currentUserId]); // ✅ Re-run when userId changes

  // Update local state when botProfile is loaded from Convex
  useEffect(() => {
    if (botProfile) {
      setDisplayName(botProfile.bot_names);
      setDescription(botProfile.bot_description);
      setPlaceholder(botProfile.msg_placeholder);
      setPrimaryColor(botProfile.primary_color);
      setAvatarUrl(botProfile.avatar_url);
      setFont(botProfile.font);
      setThemeMode(botProfile.theme_mode as "light" | "dark");
      setHeaderStyle(botProfile.header_style as "basic" | "branded");
      setMessageStyle(botProfile.message_style as "filled" | "outlined");
      setCornerRadius(botProfile.corner_radius);
      setEnableFeedback(botProfile.enable_feedback);
      setEnableFileUpload(botProfile.enable_file_upload);
      setEnableSound(botProfile.enable_sound);
      setHistoryReset(botProfile.history_reset);
    }
  }, [botProfile]);

  // Save profile to Convex
  const saveProfile = async () => {
    if (!botProfile) throw new Error("Profile not loaded");
    try {
      await updateBotProfile({
        id: botProfile._id,
        bot_names: displayName,
        bot_description: description,
        msg_placeholder: placeholder,
        primary_color: primaryColor,
        avatar_url: avatarUrl,
        font,
        theme_mode: themeMode,
        header_style: headerStyle,
        message_style: messageStyle,
        corner_radius: cornerRadius,
        enable_feedback: enableFeedback,
        enable_file_upload: enableFileUpload,
        enable_sound: enableSound,
        history_reset: historyReset,
      });
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to save profile");
      setError(error);
      throw error;
    }
  };

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
    isLoading,
    error,
    saveProfile,
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
