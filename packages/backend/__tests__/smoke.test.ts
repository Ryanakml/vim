import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_USER_ID,
  DEFAULT_VISITOR_ID,
  resetTestClient,
  resetTestData,
  seedBotProfile,
  seedConversation,
  seedMessage,
  seedPublicSession,
} from "./helpers/fixtures";

describe("integration harness smoke", () => {
  beforeAll(async () => {
    await resetTestData();
  });

  afterAll(() => {
    resetTestClient();
  });

  it("seeds and resets core records", async () => {
    const botId = await seedBotProfile({
      userId: DEFAULT_USER_ID,
      organizationId: DEFAULT_ORGANIZATION_ID,
    });

    const conversationId = await seedConversation({
      botId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      visitorId: DEFAULT_VISITOR_ID,
      integration: "embed",
    });

    const messageId = await seedMessage({
      conversationId,
      visitorId: DEFAULT_VISITOR_ID,
      role: "user",
      content: "Hello from smoke test",
    });

    const sessionId = await seedPublicSession({
      botId,
      conversationId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      visitorId: DEFAULT_VISITOR_ID,
    });

    expect(botId).toBeTruthy();
    expect(conversationId).toBeTruthy();
    expect(messageId).toBeTruthy();
    expect(sessionId).toBeTruthy();

    const resetResult = await resetTestData();
    expect(resetResult.deleted.botProfiles).toBeGreaterThanOrEqual(1);
  });
});
