#!/bin/bash

# Migration Helper Script
# Run this after deploying to clean up orphaned botProfiles records

set -e

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
BACKEND_DIR="$PROJECT_ROOT/packages/backend"

echo "🚀 Chatify Multi-Tenancy Migration Helper"
echo "=========================================="
echo ""

# Check if Convex CLI is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js"
    exit 1
fi

echo "📋 Available migrations:"
echo ""
echo "1️⃣  DELETE orphaned records (RECOMMENDED)"
echo "    → Removes botProfiles without user_id"
echo "    → Safe for development/staging"
echo ""
echo "2️⃣  MARK orphaned records"
echo "    → Just updates timestamp"
echo "    → Less recommended"
echo ""
echo "3️⃣  SHOW stats only"
echo "    → Just count records"
echo ""

read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo ""
        echo "⚠️  This will DELETE all orphaned botProfiles records."
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "Running migration: migrateUserIdForBotProfiles..."
            cd "$BACKEND_DIR"
            npx convex run migrations:migrateUserIdForBotProfiles
            echo "✅ Migration complete!"
        else
            echo "❌ Cancelled"
        fi
        ;;
    2)
        echo ""
        echo "⚠️  This will just mark orphaned records."
        read -p "Continue? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "Running migration: markOrphanedRecords..."
            cd "$BACKEND_DIR"
            npx convex run migrations:markOrphanedRecords
            echo "✅ Migration complete!"
        else
            echo "❌ Cancelled"
        fi
        ;;
    3)
        echo ""
        echo "Showing database stats..."
        echo "Check Convex Dashboard for current record count"
        echo "📊 Dashboard: https://dashboard.convex.dev"
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📚 For more details, see: MIGRATION-GUIDE.md"
