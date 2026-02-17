/**
 * PUBLIC API MODULE
 *
 * Exposes public-facing functions that don't require authentication
 * All validation happens within each function (organization_id, bot_id, session validation)
 */

export {
  getBotProfile,
  validateEmbedToken,
  createSession,
  sendMessage,
  getMessages,
  getSessionDetails,
  getConversationStatus,
  generateReply,
  generateReplyStream,
  endSession,
  trackEvent,
} from "./functions/public/index.js";
