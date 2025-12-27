#!/usr/bin/env node
/**
 * Nuclear Database Reset Script
 * 
 * This script will:
 * 1. Connect directly to PostgreSQL
 * 2. Execute the nuclear reset migration
 * 3. Update the _prisma_migrations table
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function nuclearReset() {
  console.log('🚀 Starting nuclear database reset...');
  console.log('⚠️  WARNING: This will DELETE ALL DATA in your database!');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read the migration SQL
    const migrationPath = join(__dirname, 'prisma', 'migrations', '20241227_nuclear_reset', 'migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('💥 Executing nuclear reset migration...');
    await client.query(migrationSQL);
    console.log('✅ Nuclear reset migration executed successfully');

    // Record this migration in _prisma_migrations
    console.log('📝 Recording migration in _prisma_migrations...');
    
    // First, ensure the _prisma_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Record the migration
    await client.query(`
      INSERT INTO "_prisma_migrations" 
      ("id", "checksum", "finished_at", "migration_name", "logs", "applied_steps_count", "started_at")
      VALUES 
      ($1, $2, CURRENT_TIMESTAMP, $3, $4, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO NOTHING;
    `, [
      'nuclear-reset-' + Date.now(),
      '0',
      '20241227_nuclear_reset',
      'Nuclear reset: dropped all tables and rebuilt from scratch'
    ]);

    console.log('✅ Migration recorded successfully');
    console.log('');
    console.log('🎉 Nuclear reset completed successfully!');
    console.log('');
    console.log('Your database has been completely reset:');
    console.log('  ✅ All old tables dropped');
    console.log('  ✅ All old data deleted');
    console.log('  ✅ Fresh schema created from prisma/schema.prisma');
    console.log('  ✅ All indexes created');
    console.log('  ✅ Ready for fresh testing');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error during nuclear reset:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

nuclearReset();
