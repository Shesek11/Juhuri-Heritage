#!/bin/bash

# 🚀 סקריפט להרצת מיגרציות מערכת השוק
# Usage: ./scripts/run-marketplace-migrations.sh [database_name] [username]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DB_NAME="${1:-juhuri_heritage}"
DB_USER="${2:-root}"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🏪 Marketplace System - Database Migrations${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Database:${NC} $DB_NAME"
echo -e "${YELLOW}User:${NC} $DB_USER"
echo ""

# Check if MySQL is available
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ Error: mysql command not found${NC}"
    echo "Please install MySQL client first"
    exit 1
fi

# Check if migration files exist
if [ ! -f "migrations/012_marketplace_system.sql" ]; then
    echo -e "${RED}❌ Error: Migration file not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo -e "${BLUE}Starting migrations...${NC}"
echo ""

# Migration 1: Marketplace System
echo -e "${YELLOW}[1/2]${NC} Running 012_marketplace_system.sql..."
if mysql -u "$DB_USER" -p "$DB_NAME" < migrations/012_marketplace_system.sql; then
    echo -e "${GREEN}✅ Migration 012 completed successfully${NC}"
else
    echo -e "${RED}❌ Migration 012 failed${NC}"
    exit 1
fi

echo ""

# Migration 2: Orders System
echo -e "${YELLOW}[2/2]${NC} Running 013_marketplace_orders.sql..."
if mysql -u "$DB_USER" -p "$DB_NAME" < migrations/013_marketplace_orders.sql; then
    echo -e "${GREEN}✅ Migration 013 completed successfully${NC}"
else
    echo -e "${RED}❌ Migration 013 failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Verify tables were created
echo ""
echo -e "${YELLOW}Verifying tables...${NC}"

EXPECTED_TABLES=(
    "marketplace_vendors"
    "marketplace_menu_items"
    "marketplace_hours"
    "marketplace_closures"
    "marketplace_reviews"
    "marketplace_updates"
    "marketplace_reports"
    "marketplace_cart_items"
    "marketplace_vendor_stats"
    "marketplace_orders"
    "marketplace_order_items"
    "marketplace_notifications"
)

ALL_TABLES_EXIST=true

for table in "${EXPECTED_TABLES[@]}"; do
    if mysql -u "$DB_USER" -p "$DB_NAME" -e "SHOW TABLES LIKE '$table';" 2>/dev/null | grep -q "$table"; then
        echo -e "${GREEN}✓${NC} $table"
    else
        echo -e "${RED}✗${NC} $table ${RED}(not found)${NC}"
        ALL_TABLES_EXIST=false
    fi
done

echo ""

if [ "$ALL_TABLES_EXIST" = true ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ All migrations completed successfully!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Ensure ${YELLOW}uploads/${NC} directory exists with proper permissions"
    echo -e "  2. Restart your application server"
    echo -e "  3. Test the marketplace features"
    echo ""
else
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}   ⚠️  Some tables are missing!${NC}"
    echo -e "${RED}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Please check the migration logs for errors"
    exit 1
fi
