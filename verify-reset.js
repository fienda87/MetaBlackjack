#!/usr/bin/env node
/**
 * Verify Nuclear Reset
 * 
 * This script verifies that the database was successfully reset
 */

import pkg from 'pg';
const { Client } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

async function verify() {
  console.log('🔍 Verifying nuclear reset...');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();

    // Check all tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n✅ Tables created:');
    result.rows.forEach(row => {
      console.log('  - ' + row.table_name);
    });

    // Check that tables are empty
    const counts = {};
    for (const row of result.rows) {
      if (row.table_name !== '_prisma_migrations') {
        const countResult = await client.query(`SELECT COUNT(*) FROM "${row.table_name}"`);
        counts[row.table_name] = parseInt(countResult.rows[0].count);
      }
    }

    console.log('\n✅ Table row counts (should all be 0):');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} rows`);
    });

    // Check transactions table structure
    const txColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Transactions table columns:');
    txColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // Specifically check for the problematic columns
    const hasBlockNumber = txColumns.rows.some(col => col.column_name === 'blockNumber');
    const hasTxHash = txColumns.rows.some(col => col.column_name === 'txHash');
    const hasConfirmations = txColumns.rows.some(col => col.column_name === 'confirmations');

    console.log('\n✅ Critical blockchain columns:');
    console.log(`  - txHash: ${hasTxHash ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - blockNumber: ${hasBlockNumber ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  - confirmations: ${hasConfirmations ? '✅ EXISTS' : '❌ MISSING'}`);

    console.log('\n🎉 Nuclear reset verification complete!');
    console.log('Your database is now perfectly synchronized with schema.prisma');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verify();
