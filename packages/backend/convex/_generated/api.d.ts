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
import type * as knowledge from "../knowledge.js";
import type * as migrations from "../migrations.js";
import type * as monitor from "../monitor.js";
import type * as playground from "../playground.js";
import type * as webchat from "../webchat.js";

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
  knowledge: typeof knowledge;
  migrations: typeof migrations;
  monitor: typeof monitor;
  playground: typeof playground;
  webchat: typeof webchat;
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
