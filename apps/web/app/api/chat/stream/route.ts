import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@workspace/backend/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

// ✅ CRITICAL: Set execution timeout for long-running streams
export const maxDuration = 60; // Seconds - adjust based on Vercel plan
export const runtime = "nodejs";

type EscalationConfig = {
  enabled?: boolean;
  whatsapp?: string | null;
  email?: string | null;
};

function buildEscalationPrompt(escalation?: EscalationConfig) {
  if (!escalation?.enabled) return null;

  const whatsappDigits = (escalation.whatsapp || "").replace(/\D/g, "");
  const email = (escalation.email || "").trim();

  if (!whatsappDigits || !email) {
    return null;
  }

  const whatsappLink = `https://wa.me/${whatsappDigits}`;
  const emailLink = `mailto:${email}`;

  return [
    "Escalation Protocol:",
    "- If you cannot answer from the Knowledge Base or the user asks to contact a human, you MUST include the section below exactly.",
    "- Do not add any other links anywhere in the response.",
    "",
    "### Contact Support",
    `[Chat WhatsApp](${whatsappLink})`,
    `[Email Us](${emailLink})`,
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
    const startTime = Date.now();
    let knowledgeChunksCount = 0;

    console.log(
      `[stream] Fetching context for botId: ${botId}, conversationId: ${conversationId}`,
    );

    const [botConfig, allMessages] = await Promise.all([
      // Query 1: Bot configuration (model, provider, API key, system prompt)
      convex.query(api.ai.getBotConfigForStream, { botId: botId as any }),

      // Query 2: Conversation history
      convex.query(api.ai.getConversationHistoryForStream, {
        botId: botId as any,
        conversationId: conversationId as any,
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
    const messageHistory = (allMessages || []).map((msg: any) => ({
      role: msg.role === "bot" ? "assistant" : msg.role,
      content: msg.content,
    }));

    // Step 6: Build system prompt
    const baseSystemPrompt =
      botConfig.system_prompt || "You are a helpful assistant.";
    const escalationPrompt = buildEscalationPrompt(botConfig.escalation);
    const systemPrompt = escalationPrompt
      ? `${baseSystemPrompt}\n\n${escalationPrompt}`
      : baseSystemPrompt;

    // Step 7: Initialize AI model (OpenAI, Groq, Google, etc.)
    let model;
    try {
      switch (botConfig.model_provider) {
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
        case "Google": {
          const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
          model = createGoogleGenerativeAI({ apiKey: botConfig.api_key })(
            botConfig.model_id,
          );
          break;
        }
        default:
          return NextResponse.json(
            {
              error: `Unsupported model provider: ${botConfig.model_provider}`,
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
      const { textStream } = await streamText({
        model,
        system: systemPrompt,
        messages: [
          ...messageHistory,
          { role: "user" as const, content: userMessage },
        ],
        temperature: (botConfig.temperature as number) ?? 0.7,
      });

      // Step 9: Return stream to client immediately
      console.log(`[stream] Stream response sent to client`);
      // ✅ CRITICAL FIX: Initialize variables BEFORE creating ReadableStream
      // This ensures textStream and fullStream are independent
      let fullResponseText = "";
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
                botId: botId as any,
                conversationId: conversationId as any,
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
