/**
 * Widget Component Types
 * Pure UI contracts - no app-specific dependencies
 */

export interface BotProfile {
  displayName: string;
  description: string;
  placeholder: string;
  avatarUrl?: string;
}

export interface BotAppearance {
  primaryColor: string;
  secondaryColor?: string;
  font: "inter" | "roboto" | "system";
  themeMode: "light" | "dark";
  cornerRadius: number;
  headerStyle: "basic" | "branded";
  messageStyle: "filled" | "outlined";
}

export interface BotFeatures {
  enableFeedback: boolean;
  enableFileUpload: boolean;
  enableSound: boolean;
  enableMarkdown: boolean;
}

export interface BotConfig {
  id: string;
  organizationId: string;
  profile: BotProfile;
  appearance: BotAppearance;
  features: BotFeatures;
}

export interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  createdAt: string | number | Date;
  _id?: string;
}

export type LeadClickPayload = {
  type: "whatsapp" | "email";
  href: string;
  messageId?: string;
};

export interface ChatSession {
  sessionToken: string;
  conversationId: string;
  organizationId: string;
  botId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatContainerProps {
  botConfig: BotConfig;
  session: ChatSession | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error?: Error | null;
  onSendMessage: (content: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  onClose?: () => void;
  onFeedback?: (
    messageId: string,
    feedback: "helpful" | "not-helpful",
  ) => Promise<void>;
  onLeadClick?: (payload: LeadClickPayload) => void | Promise<void>;
  className?: string;
  isOnline?: boolean;
}

export interface ChatHeaderProps {
  botName: string;
  botAvatar?: string;
  primaryColor: string;
  headerStyle: "basic" | "branded";
  themeMode: "light" | "dark";
  enableSound: boolean;
  onRefresh?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  isOnline?: boolean;
}

export interface ChatMessagesProps {
  messages: Message[];
  primaryColor: string;
  botName: string;
  botAvatar?: string;
  themeMode: "light" | "dark";
  cornerRadius: number;
  enableFeedback: boolean;
  messageStyle: "filled" | "outlined";
  isLoadingSession: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  isStreaming?: boolean;
  streamingContent?: string;
  error?: Error | null;
  onFeedback?: (messageId: string, feedback: "helpful" | "not-helpful") => void;
  onLeadClick?: (payload: LeadClickPayload) => void;
}

export interface ChatInputProps {
  placeholder: string;
  isLoading: boolean;
  isStreaming?: boolean;
  primaryColor: string;
  cornerRadius: number;
  themeMode: "light" | "dark";
  enableFileUpload: boolean;
  onSendMessage: (content: string) => void;
  onCancel?: () => void;
  value: string;
  onChange: (value: string) => void;
}

export interface MessageBubbleProps {
  message: Message;
  primaryColor: string;
  botName: string;
  botAvatar?: string;
  themeMode: "light" | "dark";
  cornerRadius: number;
  messageStyle: "filled" | "outlined";
  enableFeedback: boolean;
  onFeedback?: (messageId: string, feedback: "helpful" | "not-helpful") => void;
  onLeadClick?: (payload: LeadClickPayload) => void;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  config: BotConfig;
}
