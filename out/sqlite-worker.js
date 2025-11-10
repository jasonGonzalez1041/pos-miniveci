// SQLite WASM Worker with sql.js + IndexedDB persistence
// This worker handles all SQLite operations with persistent storage

const log = (...args) => console.log('[SQLite Worker]', ...args);
const error = (...args) => console.error('[SQLite Worker]', ...args);

// Load sql.js using fetch + eval (compatible with Cloudflare Pages Workers)
async function loadSqlJs() {
  try {
    log('Loading sql-wasm.js from /sql-wasm.js...');
    const response = await fetch('/sql-wasm.js');

    if (!response.ok) {
      throw new Error(`Failed to load sql-wasm.js: ${response.status} ${response.statusText}`);
    }

    const code = await response.text();
    log('sql-wasm.js fetched successfully, size:', code.length, 'bytes');

    // Execute the code in global worker scope
    // eslint-disable-next-line no-eval
    eval(code);

    // Verify initSqlJs is now available
    if (typeof self.initSqlJs !== 'function') {
      throw new Error('initSqlJs not defined after loading sql-wasm.js');
    }

    log('sql.js loaded successfully, initSqlJs available');
  } catch (err) {
    error('Failed to load sql.js:', err);
    self.postMessage({
      type: 'error',
      error: `SQL.js load failed: ${err instanceof Error ? err.message : String(err)}`
    });
    throw err;
  }
}

const DB_NAME = 'pos-miniveci-db';
const DB_VERSION = 1;
const STORE_NAME = 'sqliteData';

let db = null;

// Open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Load database from IndexedDB
async function loadDatabase() {
  try {
    const idb = await openIndexedDB();
    const transaction = idb.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('database');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    error('Failed to load database from IndexedDB:', err);
    return null;
  }
}

// Save database to IndexedDB
async function saveDatabase() {
  try {
    const data = db.export();
    const idb = await openIndexedDB();
    const transaction = idb.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(data, 'database');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (err) {
    error('Failed to save database to IndexedDB:', err);
  }
}

// Initialize SQLite
const initializeSQLite = async () => {
  try {
    // Load sql.js first
    await loadSqlJs();

    log('Initializing SQL.js with WASM...');

    // initSqlJs is globally available after loadSqlJs()
    // Use local files for WASM to comply with COOP/COEP headers
    const SQL = await initSqlJs({
      locateFile: file => {
        const path = `/${file}`;
        log(`Locating WASM file: ${file} -> ${path}`);
        return path;
      }
    });

    // Try to load existing database
    const savedData = await loadDatabase();

    if (savedData) {
      log('Loading existing database from IndexedDB...');
      db = new SQL.Database(new Uint8Array(savedData));
      log('Database loaded from IndexedDB');
    } else {
      log('Creating new database...');
      db = new SQL.Database();

      // Create tables if they don't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price INTEGER NOT NULL,
          stock INTEGER NOT NULL DEFAULT 0,
          image_url TEXT,
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          synced INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_products_synced ON products(synced);
        CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at);

        CREATE TABLE IF NOT EXISTS sales (
          id TEXT PRIMARY KEY,
          total INTEGER NOT NULL,
          payment_method TEXT NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          deleted_at INTEGER,
          synced INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_sales_synced ON sales(synced);
        CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);

        CREATE TABLE IF NOT EXISTS sale_items (
          id TEXT PRIMARY KEY,
          sale_id TEXT NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price INTEGER NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER DEFAULT (strftime('%s', 'now')),
          deleted_at INTEGER,
          synced INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_sale_items_synced ON sale_items(synced);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
      `);

      // Save the initial database
      await saveDatabase();
      log('New database created and saved');
    }

    log('Database initialized successfully');
    self.postMessage({ type: 'ready' });

  } catch (err) {
    error('Initialization error:', err);
    self.postMessage({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};

// Handle messages from main thread
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    let result;

    switch (type) {
      case 'exec':
        const execResult = db.exec(payload.sql, payload.params || []);
        result = execResult.length > 0 ? execResult[0].values.map(row => {
          const obj = {};
          execResult[0].columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        }) : [];
        await saveDatabase(); // Save after each operation
        break;

      case 'selectAll':
        const selectResult = db.exec(payload.sql, payload.params || []);
        result = selectResult.length > 0 ? selectResult[0].values.map(row => {
          const obj = {};
          selectResult[0].columns.forEach((col, idx) => {
            obj[col] = row[idx];
          });
          return obj;
        }) : [];
        // No need to save for read operations
        break;

      case 'run':
        db.run(payload.sql, payload.params || []);
        // Get last insert rowid
        const lastIdResult = db.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = lastIdResult[0]?.values[0]?.[0] || 0;

        result = {
          lastInsertRowid,
          changes: 1 // sql.js doesn't provide changes() method
        };

        await saveDatabase(); // Save after each write operation
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ id, type: 'success', result });

  } catch (err) {
    error('Query error:', err);
    self.postMessage({ id, type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};

// Start initialization
initializeSQLite();
