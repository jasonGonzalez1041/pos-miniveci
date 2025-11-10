// Script to reset Turso database schema
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function resetSchema() {
  try {
    console.log('🔄 Resetting Turso database schema...');

    // Drop old tables
    console.log('🗑️  Dropping old tables...');
    await client.execute('DROP TABLE IF EXISTS sale_items;');
    await client.execute('DROP TABLE IF EXISTS sales;');
    console.log('✅ Old tables dropped');

    // Create new sales table
    console.log('📝 Creating sales table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY NOT NULL,
        total INTEGER NOT NULL,
        payment_method TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        deleted_at INTEGER,
        synced INTEGER DEFAULT 0
      );
    `);
    console.log('✅ Sales table created');

    // Create new sale_items table
    console.log('📝 Creating sale_items table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id TEXT PRIMARY KEY NOT NULL,
        sale_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price INTEGER NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        deleted_at INTEGER,
        synced INTEGER DEFAULT 0
      );
    `);
    console.log('✅ Sale_items table created');

    // Create indexes
    console.log('📝 Creating indexes...');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_sale_items_synced ON sale_items(synced);');
    await client.execute('CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);');
    console.log('✅ Indexes created');

    console.log('🎉 Schema reset completed successfully!');
  } catch (error) {
    console.error('❌ Error resetting schema:', error);
    process.exit(1);
  }
}

resetSchema();
