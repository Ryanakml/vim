import { NextRequest, NextResponse } from "next/server";
import { streamText, tool, hasToolCall } from "ai";
import type { ModelMessage } from "ai";
import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/convex/_generated/api";
import type { Id } from "@workspace/backend/convex/_generated/dataModel";
import { auth } from "@clerk/nextjs/server";
import { normalizeModelProvider } from "@workspace/backend/convex/modelproviders";

// ✅ CRITICAL: Set execution timeout for long-running streams
export const maxDuration = 60; // Seconds - adjust based on Vercel plan
export const runtime = "nodejs";

type EscalationConfig = {
  enabled?: boolean;
  whatsapp?: string | null;
  email?: string | null;
};

function buildEscalationContactSection(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  if (!whatsappDigits && !email) return null;

  const contactLinks: string[] = [];
  if (whatsappDigits) {
    const whatsappLink = `https://wa.me/${whatsappDigits}`;
    contactLinks.push(`[Chat WhatsApp](${whatsappLink})`);
  }
  if (email) {
    const emailLink = `mailto:${email}`;
    contactLinks.push(`[Email Us](${emailLink})`);
  }

  return ["### Contact Support", ...contactLinks].join("\n");
}

function responseAlreadyContainsEscalation(
  responseText: string,
  escalation?: EscalationConfig,
) {
  const whatsappDigits = (escalation?.whatsapp || "").replace(/\D/g, "");
  const email = (escalation?.email || "").trim();

  const hasWhatsApp = whatsappDigits
    ? responseText.includes(`https://wa.me/${whatsappDigits}`)
    : true;
  const hasEmail = email ? responseText.includes(`mailto:${email}`) : true;

  // If a contact method is configured, require it to appear in the output.
  // If it's not configured, ignore it.
  return hasWhatsApp && hasEmail;
}

/** Regex to strip any leaked tool-name text the AI might emit. */
const TOOL_LEAK_RE = /trigger_escalation/gi;

/** Default bridge sentence when escalation fires but text is empty/short. */
const DEFAULT_BRIDGE_TEXT =
  "I can connect you with our team for further assistance.";

function buildEscalationPrompt(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  if (!whatsappDigits && !email) return null;

  return [
    "Escalation Protocol (TOOL-BASED):",
    "- PRIMARY RULE: If the Knowledge Base context contains a relevant, direct answer to the user's question, you MUST answer using it. Do not escalate in that case.",
    "- You have access to a tool called `trigger_escalation`.",
    "- When the user asks about purchasing, pricing, contact information, speaking to sales, or needs human assistance, you MUST call the `trigger_escalation` tool.",
    "- When the user expresses frustration, anger, dissatisfaction, or repeatedly fails to get a satisfactory answer, you MUST call the `trigger_escalation` tool.",
    "- If (and only if) the user asks for contact details / human support and you find contact details (phone numbers, emails, WhatsApp numbers) in the Knowledge Base context, you MUST call the `trigger_escalation` tool instead of outputting them as plain text.",
    "- You are STRICTLY FORBIDDEN from outputting phone numbers, WhatsApp numbers, or email addresses in plain text, even if they exist in the Knowledge Base. ALWAYS use the `trigger_escalation` tool instead.",
    "- DO NOT write 'trigger_escalation' as text. Just call the tool function.",
    "- DO NOT say things like 'Sistem akan memunculkan tombol' or 'tombol akan muncul'. The UI is not your responsibility.",
    "- If you are going to say you will connect the user to Admin/CS/Sales (or suggest pressing buttons), you MUST call the `trigger_escalation` tool instead of writing that as plain text.",
    "- Before calling the tool, generate a short, polite bridge sentence (e.g., 'I can connect you with our team for further assistance.').",
    "- Do NOT make up contact information.",
  ].join("\n");
}

/**
 * Streaming endpoint for bot responses
 *
 * POST /api/chat/stream
 *
 * Request body:
 * {
 *   botId: string (Convex ID)
 *   conversationId: string (Convex ID)
 *   userMessage: string
 * }
 *
 * Response: Server-Sent Events (text/event-stream)
 * Each event has format: data: {"type": "text-delta", "delta": "..."}
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { botId, conversationId, userMessage } = await request.json();

    // Step 1: Validate inputs
    if (!botId || !conversationId || !userMessage) {
      return NextResponse.json(
        {
          error: "Missing required fields: botId, conversationId, userMessage",
        },
        { status: 400 },
      );
    }

    if (!userMessage.trim() || userMessage.length > 4000) {
      return NextResponse.json(
        { error: "Message must be 1-4000 characters" },
        { status: 400 },
      );
    }

    // Step 2: Create Convex client (server-side only) with auth
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const convexToken = await getToken({ template: "convex" });
    if (!convexToken) {
      return NextResponse.json(
        { error: "Unauthorized: Missing Convex auth token" },
        { status: 401 },
      );
    }
    convex.setAuth(convexToken);

    // Step 3: Fetch context in parallel (before streaming starts)
    let knowledgeChunksCount = 0;

    console.log(
      `[stream] Fetching context for botId: ${botId}, conversationId: ${conversationId}`,
    );

    const botIdId = botId as unknown as Id<"botProfiles">;
    const conversationIdId = conversationId as unknown as Id<"conversations">;

    const [botConfig, allMessages, rag] = await Promise.all([
      // Query 1: Bot configuration (model, provider, API key, system prompt)
      convex.action(api.ai.getBotConfigForStream, {
        botId: botIdId,
        serverSecret: process.env.CONVEX_SERVER_SHARED_SECRET!,
      }),

      // Query 2: Conversation history
      convex.query(api.ai.getConversationHistoryForStream, {
        botId: botIdId,
        conversationId: conversationIdId,
      }),

      // ✅ FIXED: Action (not query) - must perform network I/O for embedding generation
      // Changed from convex.query to convex.action because getRagContextForStream
      // calls retrieveRagContext which performs network I/O via generateEmbedding
      convex.action(api.ai.getRagContextForStream, {
        botId: botIdId,
        conversationId: conversationIdId,
        userMessage: userMessage as string,
      }),
    ]);

    // Step 4: Validate configuration
    if (
      !botConfig ||
      !botConfig.model_provider ||
      !botConfig.model_id ||
      !botConfig.api_key
    ) {
      return NextResponse.json(
        {
          error:
            "Bot not properly configured. Check model, provider, and API key.",
        },
        { status: 400 },
      );
    }

    console.log(
      `[stream] Context fetched - ${allMessages?.length || 0} messages`,
    );

    // Step 5: Prepare message history for AI SDK
    const messageHistory: ModelMessage[] = (allMessages || []).map(
      (msg: { role: string; content: string }) => {
        // Important: ModelMessage is a discriminated union; ensure `role` is a literal.
        // Also avoid producing `tool` messages unless we have the required structure.
        const normalizedRole =
          msg.role === "assistant" || msg.role === "bot"
            ? ("assistant" as const)
            : msg.role === "system"
              ? ("system" as const)
              : ("user" as const);

        if (normalizedRole === "assistant") {
          return { role: "assistant" as const, content: msg.content };
        }
        if (normalizedRole === "system") {
          return { role: "system" as const, content: msg.content };
        }
        return { role: "user" as const, content: msg.content };
      },
    );

    // Step 6: Build system prompt (include KB context when available)
    const baseSystemPrompt =
      botConfig.system_prompt || "You are a helpful assistant.";

    const contextBlock = rag?.contextBlock || "";
    knowledgeChunksCount = rag?.knowledgeChunksCount || 0;

    const systemPromptWithContext = contextBlock
      ? `${baseSystemPrompt}\n\nRelevant Knowledge Base Information:\n-----------------------------------\n${contextBlock}\n-----------------------------------\nUse the information above to answer the user's question if relevant.`
      : baseSystemPrompt;

    const escalationContactSection = buildEscalationContactSection(
      botConfig.escalation,
    );
    const escalationPrompt = buildEscalationPrompt(botConfig.escalation);
    const systemPrompt = escalationPrompt
      ? `${systemPromptWithContext}\n\n${escalationPrompt}`
      : systemPromptWithContext;

    // Step 7: Initialize AI model (OpenAI, Groq, Google AI, Anthropic)
    let model;
    try {
      const provider = normalizeModelProvider(botConfig.model_provider);
      if (!provider) {
        return NextResponse.json(
          {
            error: `Unsupported model provider: ${botConfig.model_provider}`,
          },
          { status: 400 },
        );
      }

      switch (provider) {
        case "Groq": {
          const { createGroq } = await import("@ai-sdk/groq");
          model = createGroq({ apiKey: botConfig.api_key })(botConfig.model_id);
          break;
        }
        case "OpenAI": {
          const { createOpenAI } = await import("@ai-sdk/openai");
          model = createOpenAI({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        case "Google AI": {
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          model = createGoogleGenerativeAI({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        case "Anthropic": {
          const { createAnthropic } = await import("@ai-sdk/anthropic");
          model = createAnthropic({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        default:
          return NextResponse.json(
            {
              error: `Unsupported model provider: ${provider}`,
            },
            { status: 400 },
          );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to initialize model: ${msg}` },
        { status: 500 },
      );
    }

    // Step 8: START STREAMING - Execute streamText() directly in Next.js
    console.log(
      `[stream] Starting stream for model: ${botConfig.model_id} (${botConfig.model_provider})`,
    );

    try {
      // Build the trigger_escalation tool (only if escalation is enabled & configured)
      const tools = escalationContactSection
        ? {
            trigger_escalation: tool({
              description:
                "Call this tool whenever the user asks for support, sales, human contact, or expresses frustration/anger. Also use this tool if you find contact details in the Context/Knowledge Base that answer the user's request.",
              inputSchema: z.object({}),
            }),
          }
        : undefined;

      const { textStream, steps } = await streamText({
        model,
        system: systemPrompt,
        messages: [
          ...messageHistory,
          { role: "user" as const, content: userMessage },
        ],
        temperature: (botConfig.temperature as number) ?? 0.7,
        tools,
        stopWhen: tools ? hasToolCall("trigger_escalation") : undefined,
      });

      // Step 9: Return stream to client immediately
      console.log(`[stream] Stream response sent to client`);
      // ✅ CRITICAL FIX: Initialize variables BEFORE creating ReadableStream
      // This ensures textStream and fullStream are independent
      let fullResponseText = "";
      let toolNameLeaked = false;
      const startTime = Date.now();

      // Convert text stream to Server-Sent Events format
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          try {
            let chunkNum = 0;

            // Iterate textStream and collect for database save
            for await (const textChunk of textStream as AsyncIterable<string>) {
              chunkNum++;

              // Detect leaked tool name in this chunk
              if (TOOL_LEAK_RE.test(textChunk)) {
                toolNameLeaked = true;
                // Strip the tool name from the chunk; skip sending if empty
                const cleaned = textChunk
                  .replace(TOOL_LEAK_RE, "")
                  .replace(/\s{2,}/g, " ");
                if (cleaned.length > 0) {
                  fullResponseText += cleaned;
                  const event = `data: ${JSON.stringify({
                    type: "text-delta",
                    delta: cleaned,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(event));
                }
                continue; // skip the original chunk
              }

              // Collect for database save
              fullResponseText += textChunk;

              console.log(
                `[stream] 📤 Streaming chunk #${chunkNum}: "${textChunk.slice(0, 50)}"`,
              );
              const event = `data: ${JSON.stringify({
                type: "text-delta",
                delta: textChunk,
              })}\n\n`;
              const encoded = encoder.encode(event);
              console.log(
                `[stream] 📤 Enqueuing ${encoded.length} bytes for chunk #${chunkNum}`,
              );

              // ✅ CRITICAL: Enqueue immediately (no delay, no batching)
              controller.enqueue(encoded);

              // ✅ Small delay to allow chunks to flush (prevents buffering)
              // This ensures browser receives chunks incrementally, not all at once
              await new Promise((resolve) => setTimeout(resolve, 0));
            }

            // After text stream completes, check if the AI called the trigger_escalation tool
            const resolvedSteps = await steps;
            const escalationToolCalled = resolvedSteps?.some(
              (step: { toolCalls?: Array<{ toolName: string }> }) =>
                step.toolCalls?.some(
                  (tc) => tc.toolName === "trigger_escalation",
                ),
            );

            if (
              (escalationToolCalled || toolNameLeaked) &&
              escalationContactSection &&
              !responseAlreadyContainsEscalation(
                fullResponseText,
                botConfig.escalation,
              )
            ) {
              // If remaining text is empty/too short, send a polite bridge sentence first
              if (fullResponseText.trim().length < 5) {
                fullResponseText = DEFAULT_BRIDGE_TEXT;
                const bridgeEvent = `data: ${JSON.stringify({
                  type: "text-delta",
                  delta: DEFAULT_BRIDGE_TEXT,
                })}\n\n`;
                controller.enqueue(encoder.encode(bridgeEvent));
              }
              const appendix = `\n\n${escalationContactSection}`;
              fullResponseText += appendix;
              const event = `data: ${JSON.stringify({
                type: "text-delta",
                delta: appendix,
              })}\n\n`;
              controller.enqueue(encoder.encode(event));
            }

            console.log(
              `[stream] ✅ Stream complete - ${chunkNum} chunks sent`,
            );
            controller.close();

            // Step 10: NOW save complete response to database (after stream completes)
            const executionTimeMs = Date.now() - startTime;
            console.log(
              `[stream] Stream completed - ${fullResponseText.length} chars in ${executionTimeMs}ms`,
            );

            try {
              console.log("[stream] Saving complete response to database...");
              await convex.mutation(api.ai.saveStreamedResponse, {
                botId: botIdId,
                conversationId: conversationIdId,
                userMessage,
                botResponse: fullResponseText,
                model: botConfig.model_id as string,
                provider: botConfig.model_provider as string,
                executionTimeMs,
                knowledgeChunksRetrieved: knowledgeChunksCount,
                streamingEnabled: true,
                firstTokenTime: executionTimeMs,
                integration: "streaming",
              });
              console.log(`[stream] ✅ Response saved to database`);
            } catch (saveError) {
              console.error("[stream] Failed to save response:", saveError);
              // Log but don't throw - stream already sent to user
            }
          } catch (error) {
            console.error("[stream] Error in stream:", error);
            controller.error(error);
          }
        },
      });

      // Return the stream immediately (don't wait for save)
      return new NextResponse(customStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (streamError) {
      const errorMsg =
        streamError instanceof Error
          ? streamError.message
          : "Unknown streaming error";
      console.error(`[stream] Streaming failed: ${errorMsg}`);

      // Send error to client
      return NextResponse.json(
        { error: `Streaming failed: ${errorMsg}` },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Route handler error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
