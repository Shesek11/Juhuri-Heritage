#!/usr/bin/env node

/**
 * 🚀 סקריפט להרצת מיגרציות מערכת השוק
 * Usage: node scripts/run-marketplace-migrations.js
 *
 * הסקריפט קורא את פרטי ההתחברות מ-.env או משתמש בברירת המחדל
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

// Database configuration from environment variables
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'juhuri_heritage',
    multipleStatements: true,
    charset: 'utf8mb4'
};

const MIGRATIONS = [
    {
        file: 'migrations/012_marketplace_system.sql',
        name: 'Marketplace System'
    },
    {
        file: 'migrations/013_marketplace_orders.sql',
        name: 'Orders & Notifications'
    }
];

const EXPECTED_TABLES = [
    'marketplace_vendors',
    'marketplace_menu_items',
    'marketplace_hours',
    'marketplace_closures',
    'marketplace_reviews',
    'marketplace_updates',
    'marketplace_reports',
    'marketplace_cart_items',
    'marketplace_vendor_stats',
    'marketplace_orders',
    'marketplace_order_items',
    'marketplace_notifications'
];

async function runMigration(connection, migrationFile, migrationName) {
    try {
        log(colors.yellow, `\n[Running] ${migrationName}...`);

        const sqlPath = path.join(__dirname, '..', migrationFile);
        const sql = await fs.readFile(sqlPath, 'utf8');

        await connection.query(sql);

        log(colors.green, `✅ ${migrationName} completed successfully`);
        return true;
    } catch (error) {
        log(colors.red, `❌ ${migrationName} failed:`);
        console.error(error.message);
        return false;
    }
}

async function verifyTables(connection) {
    log(colors.yellow, '\n\nVerifying tables...');

    let allTablesExist = true;

    for (const table of EXPECTED_TABLES) {
        try {
            const [rows] = await connection.query(
                'SHOW TABLES LIKE ?',
                [table]
            );

            if (rows.length > 0) {
                log(colors.green, `✓ ${table}`);
            } else {
                log(colors.red, `✗ ${table} (not found)`);
                allTablesExist = false;
            }
        } catch (error) {
            log(colors.red, `✗ ${table} (error checking)`);
            allTablesExist = false;
        }
    }

    return allTablesExist;
}

async function main() {
    log(colors.blue, '════════════════════════════════════════════════════════');
    log(colors.blue, '   🏪 Marketplace System - Database Migrations');
    log(colors.blue, '════════════════════════════════════════════════════════');

    console.log('');
    log(colors.yellow, `Database: ${DB_CONFIG.database}`);
    log(colors.yellow, `Host: ${DB_CONFIG.host}`);
    log(colors.yellow, `User: ${DB_CONFIG.user}`);
    console.log('');

    let connection;

    try {
        // Connect to database
        log(colors.blue, 'Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        log(colors.green, '✅ Connected successfully');

        // Run migrations
        log(colors.blue, '\nStarting migrations...');

        for (let i = 0; i < MIGRATIONS.length; i++) {
            const migration = MIGRATIONS[i];
            const success = await runMigration(
                connection,
                migration.file,
                `[${i + 1}/${MIGRATIONS.length}] ${migration.name}`
            );

            if (!success) {
                log(colors.red, '\n❌ Migration failed. Stopping.');
                process.exit(1);
            }
        }

        // Verify tables
        const allTablesExist = await verifyTables(connection);

        console.log('');
        log(colors.blue, '════════════════════════════════════════════════════════');

        if (allTablesExist) {
            log(colors.green, '   ✅ All migrations completed successfully!');
            log(colors.green, '════════════════════════════════════════════════════════');
            console.log('');
            console.log('Next steps:');
            log(colors.yellow, '  1. Ensure uploads/ directory exists with proper permissions');
            log(colors.yellow, '  2. Restart your application server (pm2 restart juhuri-heritage)');
            log(colors.yellow, '  3. Test the marketplace features');
            console.log('');
        } else {
            log(colors.red, '   ⚠️  Some tables are missing!');
            log(colors.red, '════════════════════════════════════════════════════════');
            console.log('');
            console.log('Please check the migration logs for errors');
            process.exit(1);
        }

    } catch (error) {
        log(colors.red, '\n❌ Error:');
        console.error(error.message);

        if (error.code === 'ENOENT') {
            log(colors.yellow, '\nMake sure you are running this script from the project root directory.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            log(colors.yellow, '\nDatabase access denied. Please check your credentials in .env file:');
            console.log('  DB_HOST=localhost');
            console.log('  DB_USER=your_username');
            console.log('  DB_PASSWORD=your_password');
            console.log('  DB_NAME=juhuri_heritage');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            log(colors.yellow, `\nDatabase "${DB_CONFIG.database}" does not exist.`);
            log(colors.yellow, 'Please create it first:');
            console.log(`  CREATE DATABASE ${DB_CONFIG.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the script
main();
