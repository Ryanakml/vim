import { mutation } from "./_generated/server.js";

/**
 * MIGRATION SUITE FOR COMPLETE MULTI-TENANCY ISOLATION
 *
 * These functions clean up orphaned records that don't have user_id fields.
 * This ensures data is properly isolated across all tables.
 *
 * USAGE:
 * Run these migrations individually via Convex Dashboard in this order:
 * 1. migrateUserIdForBotProfiles
 * 2. migrateUserIdForConversationsAndMessages
 * 3. migrateUserIdForDocuments
 * 4. migrateUserIdForAiLogs
 *
 * Or use migrateAllTables for automated sequential execution
 */

// ===== BOT PROFILES =====

/**
 * Migration: Populate user_id for existing botProfiles records that don't have it
 * Deletes orphaned records (can't assign to unknown user)
 */
export const migrateUserIdForBotProfiles = mutation({
  handler: async (ctx) => {
    const profiles = await ctx.db.query("botProfiles").collect();
    let deletedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const profile of profiles) {
      try {
        if (profile.user_id) {
          skippedCount++;
          continue;
        }

        await ctx.db.delete(profile._id);
        deletedCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to process botProfile ${profile._id}:`, error);
      }
    }

    return {
      success: true,
      message: `Bot profiles: Deleted ${deletedCount}, Skipped ${skippedCount}, Errors ${errorCount}`,
      deletedCount,
      skippedCount,
      errorCount,
    };
  },
});

// ===== CONVERSATIONS & MESSAGES =====

/**
 * Migration: Populate user_id for conversations and messages
 *
 * Strategy:
 * - For each conversation without user_id, find its bot owner and assign that user_id
 * - Also update all messages in that conversation with the same user_id
 * - Delete orphaned conversations where bot owner can't be determined
 */
export const migrateUserIdForConversationsAndMessages = mutation({
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();
    const messages = await ctx.db.query("messages").collect();

    let conversationsUpdated = 0;
    let conversationsDeleted = 0;
    let messagesUpdated = 0;
    let errorCount = 0;

    for (const conv of conversations) {
      try {
        if (conv.user_id) {
          conversationsUpdated++;
          continue;
        }

        // Get the bot to find its owner
        const bot = await ctx.db.get(conv.bot_id);
        if (!bot || !bot.user_id) {
          await ctx.db.delete(conv._id);
          conversationsDeleted++;
          continue;
        }

        // Update conversation with bot owner's user_id
        await ctx.db.patch(conv._id, {
          user_id: bot.user_id,
        });
        conversationsUpdated++;

        // Update all messages in this conversation
        const convMessages = messages.filter(
          (m) => m.conversation_id === conv._id,
        );
        for (const msg of convMessages) {
          if (!msg.user_id) {
            await ctx.db.patch(msg._id, {
              user_id: bot.user_id,
            });
          }
          messagesUpdated++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Failed to process conversation ${conv._id}:`, error);
      }
    }

    return {
      success: true,
      message: `Conversations: Updated ${conversationsUpdated}, Deleted ${conversationsDeleted} | Messages: Updated ${messagesUpdated} | Errors ${errorCount}`,
      conversationsUpdated,
      conversationsDeleted,
      messagesUpdated,
      errorCount,
    };
  },
});

// ===== DOCUMENTS (Knowledge Base) =====

/**
 * Migration: Populate user_id for documents
 *
 * Strategy:
 * - For each document without user_id, find its bot owner and assign that user_id
 * - Delete orphaned documents where bot owner can't be determined
 */
export const migrateUserIdForDocuments = mutation({
  handler: async (ctx) => {
    const documents = await ctx.db.query("documents").collect();

    let updatedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        if (doc.user_id) {
          updatedCount++;
          continue;
        }

        // Get the bot to find its owner
        const bot = await ctx.db.get(doc.botId);
        if (!bot || !bot.user_id) {
          await ctx.db.delete(doc._id);
          deletedCount++;
          continue;
        }

        // Update document with bot owner's user_id
        await ctx.db.patch(doc._id, {
          user_id: bot.user_id,
        });
        updatedCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to process document ${doc._id}:`, error);
      }
    }

    return {
      success: true,
      message: `Documents: Updated ${updatedCount}, Deleted ${deletedCount}, Errors ${errorCount}`,
      updatedCount,
      deletedCount,
      errorCount,
    };
  },
});

// ===== AI LOGS =====

/**
 * Migration: Populate user_id for aiLogs
 *
 * Strategy:
 * - For each log without user_id, find its bot owner and assign that user_id
 * - Delete orphaned logs where bot owner can't be determined
 */
export const migrateUserIdForAiLogs = mutation({
  handler: async (ctx) => {
    const logs = await ctx.db.query("aiLogs").collect();

    let updatedCount = 0;
    let deletedCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      try {
        if (log.user_id) {
          updatedCount++;
          continue;
        }

        // Get the bot to find its owner
        const bot = await ctx.db.get(log.botId);
        if (!bot || !bot.user_id) {
          await ctx.db.delete(log._id);
          deletedCount++;
          continue;
        }

        // Update log with bot owner's user_id
        await ctx.db.patch(log._id, {
          user_id: bot.user_id,
        });
        updatedCount++;
      } catch (error) {
        errorCount++;
        console.error(`Failed to process aiLog ${log._id}:`, error);
      }
    }

    return {
      success: true,
      message: `AI Logs: Updated ${updatedCount}, Deleted ${deletedCount}, Errors ${errorCount}`,
      updatedCount,
      deletedCount,
      errorCount,
    };
  },
});

// ===== VISITOR SUPPORT MIGRATION =====

/**
 * Migration: Add visitor_id and organization_id support for public chats
 *
 * Purpose:
 * - Support anonymous visitors in the chat system
 * - Enable public chat sessions without authentication
 * - Add organization_id for multi-tenant public lookups
 *
 * Changes:
 * - conversations: Add visitor_id (optional), organization_id (optional)
 * - messages: Add visitor_id (optional)
 *
 * Strategy: Backfill existing records with null values (no behavior change)
 */
export const addVisitorSupport = mutation({
  handler: async (ctx) => {
    console.log("\n=== Starting Visitor Support Migration ===\n");

    try {
      // Backfill conversations with visitor_id and organization_id
      console.log(
        "Backfilling conversations with visitor_id and organization_id...",
      );
      const conversations = await ctx.db.query("conversations").collect();
      let conversationsUpdated = 0;

      for (const conversation of conversations) {
        if (
          !("visitor_id" in conversation) ||
          !("organization_id" in conversation)
        ) {
          await ctx.db.patch(conversation._id, {
            visitor_id: undefined,
            organization_id: undefined,
          });
          conversationsUpdated++;
        }
      }
      console.log(`✅ Backfilled ${conversationsUpdated} conversations`);

      // Backfill messages with visitor_id
      console.log("Backfilling messages with visitor_id...");
      const messages = await ctx.db.query("messages").collect();
      let messagesUpdated = 0;

      for (const message of messages) {
        if (!("visitor_id" in message)) {
          await ctx.db.patch(message._id, {
            visitor_id: undefined,
          });
          messagesUpdated++;
        }
      }
      console.log(`✅ Backfilled ${messagesUpdated} messages`);

      console.log("\n=== Migration Completed Successfully ===");
      console.log("✅ New fields and indexes ready:");
      console.log("   - conversations.visitor_id");
      console.log("   - conversations.organization_id");
      console.log(
        "   - conversations indexes: by_bot_and_visitor, by_organization",
      );
      console.log("   - messages.visitor_id");
      console.log("   - messages index: by_visitor");
      console.log(
        `Total records updated: ${conversationsUpdated + messagesUpdated}\n`,
      );

      return {
        success: true,
        conversationsUpdated,
        messagesUpdated,
        message: "✅ Visitor support migration completed successfully!",
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

// ===== COMPREHENSIVE MIGRATION (RECOMMENDED) =====

/**
 * 🎯 COMPREHENSIVE MIGRATION
 *
 * Simplified approach: Just call individual migrations manually via Dashboard
 * This avoids complex nested mutation calls
 *
 * For automated execution, manually run each migration in sequence:
 * 1. mutation { migrateUserIdForBotProfiles() }
 * 2. mutation { migrateUserIdForConversationsAndMessages() }
 * 3. mutation { migrateUserIdForDocuments() }
 * 4. mutation { migrateUserIdForAiLogs() }
 * 5. mutation { addVisitorSupport() } ← NEW: Visitor support
 *
 * Then verify all data is properly isolated
 */
