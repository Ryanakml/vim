/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiAnalytics from "../aiAnalytics.js";
import type * as analytics from "../analytics.js";
import type * as configuration from "../configuration.js";
import type * as documentchunker from "../documentchunker.js";
import type * as functions_public_createSession from "../functions/public/createSession.js";
import type * as functions_public_endSession from "../functions/public/endSession.js";
import type * as functions_public_generateReply from "../functions/public/generateReply.js";
import type * as functions_public_generateReplyStream from "../functions/public/generateReplyStream.js";
import type * as functions_public_getBotProfile from "../functions/public/getBotProfile.js";
import type * as functions_public_getConversationStatus from "../functions/public/getConversationStatus.js";
import type * as functions_public_getMessages from "../functions/public/getMessages.js";
import type * as functions_public_getSessionDetails from "../functions/public/getSessionDetails.js";
import type * as functions_public_index from "../functions/public/index.js";
import type * as functions_public_sendMessage from "../functions/public/sendMessage.js";
import type * as functions_public_trackEvent from "../functions/public/trackEvent.js";
import type * as kbanalytics from "../kbanalytics.js";
import type * as knowledge from "../knowledge.js";
import type * as migrations from "../migrations.js";
import type * as modelproviders from "../modelproviders.js";
import type * as monitor from "../monitor.js";
import type * as pdfparser from "../pdfparser.js";
import type * as playground from "../playground.js";
import type * as public_ from "../public.js";
import type * as rag from "../rag.js";
import type * as testing from "../testing.js";
import type * as webchat from "../webchat.js";
import type * as websitescraper from "../websitescraper.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiAnalytics: typeof aiAnalytics;
  analytics: typeof analytics;
  configuration: typeof configuration;
  documentchunker: typeof documentchunker;
  "functions/public/createSession": typeof functions_public_createSession;
  "functions/public/endSession": typeof functions_public_endSession;
  "functions/public/generateReply": typeof functions_public_generateReply;
  "functions/public/generateReplyStream": typeof functions_public_generateReplyStream;
  "functions/public/getBotProfile": typeof functions_public_getBotProfile;
  "functions/public/getConversationStatus": typeof functions_public_getConversationStatus;
  "functions/public/getMessages": typeof functions_public_getMessages;
  "functions/public/getSessionDetails": typeof functions_public_getSessionDetails;
  "functions/public/index": typeof functions_public_index;
  "functions/public/sendMessage": typeof functions_public_sendMessage;
  "functions/public/trackEvent": typeof functions_public_trackEvent;
  kbanalytics: typeof kbanalytics;
  knowledge: typeof knowledge;
  migrations: typeof migrations;
  modelproviders: typeof modelproviders;
  monitor: typeof monitor;
  pdfparser: typeof pdfparser;
  playground: typeof playground;
  public: typeof public_;
  rag: typeof rag;
  testing: typeof testing;
  webchat: typeof webchat;
  websitescraper: typeof websitescraper;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
