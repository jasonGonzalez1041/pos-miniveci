// Script to check Turso database schema
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkSchema() {
  try {
    console.log('🔍 Checking products table schema...');

    const result = await client.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='products';
    `);

    console.log('Products table schema:');
    console.log(result.rows[0]);

    console.log('\n🔍 Checking sales table schema...');
    const salesResult = await client.execute(`
      SELECT sql FROM sqlite_master WHERE type='table' AND name='sales';
    `);

    console.log('Sales table schema:');
    console.log(salesResult.rows[0]);

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema();
