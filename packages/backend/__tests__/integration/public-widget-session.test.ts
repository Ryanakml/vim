import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anyApi } from "convex/server";
import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_USER_ID,
  getTestClient,
  resetTestClient,
  resetTestData,
  seedBotProfile,
} from "../helpers/fixtures";

describe("public widget session lifecycle", () => {
  beforeAll(async () => {
    await resetTestData();
  });

  afterAll(() => {
    resetTestClient();
  });

  it("creates a session, generates a reply, and closes", async () => {
    const client = getTestClient();

    const botId = await seedBotProfile({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORGANIZATION_ID,
      modelProvider: "OpenAI",
      modelId: "gpt-4o-mini",
      apiKey: "test-api-key",
    });

    const session = await client.mutation(anyApi.public.createSession, {
      organizationId: DEFAULT_ORGANIZATION_ID,
      botId: botId as any,
    });

    expect(session.sessionId).toBeTruthy();
    expect(session.conversationId).toBeTruthy();
    expect(session.visitorId).toBeTruthy();

    const userMessage = "Hello";

    await client.mutation(anyApi.public.sendMessage, {
      sessionId: session.sessionId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      botId: botId as any,
      visitorId: session.visitorId,
      content: userMessage,
    });

    const reply = await client.action(anyApi.public.generateReply, {
      sessionId: session.sessionId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      botId: botId as any,
      visitorId: session.visitorId,
      userMessage,
    });

    expect(reply.success).toBe(true);
    expect(reply.content).toBeTruthy();

    const messages = await client.query(anyApi.public.getMessages, {
      sessionId: session.sessionId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      botId: botId as any,
      visitorId: session.visitorId,
    });

    const roles = messages.map((message: { role: string }) => message.role);
    expect(roles).toContain("user");
    expect(roles).toContain("bot");

    const endResult = await client.mutation(anyApi.public.endSession, {
      sessionId: session.sessionId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      botId: botId as any,
    });

    expect(endResult.success).toBe(true);

    const publicSession = await client.query(anyApi.testing.getPublicSession, {
      sessionId: session.sessionId,
    });

    expect(publicSession?.status).toBe("ended");

    const conversation = await client.query(anyApi.testing.getConversation, {
      conversationId: session.conversationId as any,
    });

    expect(conversation?.status).toBe("closed");

    const aiLogs = await client.query(
      anyApi.testing.getAiLogsForConversation,
      {
        conversationId: session.conversationId as any,
      },
    );

    expect(aiLogs.length).toBeGreaterThanOrEqual(1);
  });
});
