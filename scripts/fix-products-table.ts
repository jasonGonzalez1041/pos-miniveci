// Script to add missing synced column to products table
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function fixProductsTable() {
  try {
    console.log('🔧 Adding synced column to products table...');

    // Add synced column
    await client.execute(`
      ALTER TABLE products ADD COLUMN synced INTEGER DEFAULT 0;
    `);

    console.log('✅ Synced column added successfully!');

    // Verify the change
    const result = await client.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='products';
    `);

    console.log('\n📋 Updated products table schema:');
    console.log(result.rows[0]);

  } catch (error) {
    console.error('❌ Error fixing products table:', error);
  }
}

fixProductsTable();
