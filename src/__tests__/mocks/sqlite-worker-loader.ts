/**
 * Mock SQLite Worker Loader for Testing
 * 
 * This module extracts the core functionality from public/sqlite-worker.js
 * to make it testable. It simulates the worker environment and exposes
 * the critical functions that need testing.
 */

const log = (...args: any[]) => console.log('[SQLite Worker]', ...args);
const error = (...args: any[]) => console.error('[SQLite Worker]', ...args);

// Global references for testing
declare global {
  var db: any;
  var dbInstance: any;
  var self: any;
  var initSqlJs: any;
}

/**
 * CRITICAL FUNCTION: Load sql.js using fetch + eval
 * This is the function that contains the Debug-GOD fix
 */
export async function loadSqlJs(): Promise<void> {
  try {
    log('Loading sql-wasm.js from /sql-wasm.js...');
    const response = await fetch('/sql-wasm.js');

    if (!response.ok) {
      throw new Error(`Failed to load sql-wasm.js: ${response.status} ${response.statusText}`);
    }

    const code = await response.text();
    log('sql-wasm.js fetched successfully, size:', code.length, 'bytes');

    // CRITICAL FIX: Execute the code in the worker's global scope (indirect eval)
    // eslint-disable-next-line no-eval
    (0, eval)(code);

    // CRITICAL FIX: Ensure initSqlJs is exposed on the global scope
    if (typeof self?.initSqlJs !== 'function' && typeof initSqlJs === 'function') {
      if (self) {
        self.initSqlJs = initSqlJs;
      }
    }

    // Verify initSqlJs is now available
    const globalInitSqlJs = self?.initSqlJs || global.initSqlJs;
    if (typeof globalInitSqlJs !== 'function') {
      throw new Error('initSqlJs not defined after loading sql-wasm.js');
    }

    log('sql.js loaded successfully, initSqlJs available');
  } catch (err) {
    error('Failed to load sql.js:', err);
    throw err;
  }
}

/**
 * Load existing database from IndexedDB
 */
export async function loadDatabase(): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('sqlite_db', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sqlite_db')) {
          db.createObjectStore('sqlite_db');
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['sqlite_db'], 'readonly');
        const store = transaction.objectStore('sqlite_db');
        const getRequest = store.get('database');
        
        getRequest.onsuccess = () => {
          const result = getRequest.result;
          resolve(result ? result.data : null);
        };
        
        getRequest.onerror = () => {
          resolve(null);
        };
      };
      
      request.onerror = () => {
        resolve(null);
      };
    } catch (err) {
      resolve(null);
    }
  });
}

/**
 * Save database to IndexedDB
 */
export async function saveDatabase(): Promise<void> {
  if (!global.db) {
    throw new Error('Database not initialized');
  }
  
  return new Promise((resolve, reject) => {
    try {
      const data = global.db.export();
      const request = indexedDB.open('sqlite_db', 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('sqlite_db')) {
          db.createObjectStore('sqlite_db');
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['sqlite_db'], 'readwrite');
        const store = transaction.objectStore('sqlite_db');
        const putRequest = store.put({ data }, 'database');
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to save database'));
      };
      
      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Initialize SQLite with the loaded sql.js
 */
export async function initializeSQLite(): Promise<void> {
  try {
    // Load sql.js first
    await loadSqlJs();

    log('Initializing SQL.js with WASM...');

    // Get initSqlJs from global scope (after the fix)
    const globalInitSqlJs = self?.initSqlJs || global.initSqlJs;
    if (!globalInitSqlJs) {
      throw new Error('initSqlJs not available after loading');
    }

    // Use local files for WASM to comply with COOP/COEP headers
    const SQL = await globalInitSqlJs({
      locateFile: (file: string) => {
        const path = `/${file}`;
        log(`Locating WASM file: ${file} -> ${path}`);
        return path;
      }
    });

    // Try to load existing database
    const savedData = await loadDatabase();

    if (savedData) {
      log('Loading existing database from IndexedDB...');
      global.db = new SQL.Database(new Uint8Array(savedData));
      log('Database loaded from IndexedDB');
    } else {
      log('Creating new database...');
      global.db = new SQL.Database();

      // Create tables if they don't exist
      global.db.run(`
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
    if (self?.postMessage) {
      self.postMessage({ type: 'ready' });
    }

  } catch (err) {
    error('Initialization error:', err);
    if (self?.postMessage) {
      self.postMessage({ 
        type: 'error', 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
    throw err;
  }
}

/**
 * Handle worker messages (extracted from the worker's onmessage handler)
 */
export async function handleWorkerMessage(messageData: {
  id: string;
  type: string;
  payload: any;
}): Promise<void> {
  const { id, type, payload } = messageData;

  try {
    let result: any;

    switch (type) {
      case 'exec':
        const execResult = global.db.exec(payload.sql, payload.params || []);
        result = execResult.length > 0 ? execResult[0].values.map((row: any[]) => {
          const obj: any = {};
          execResult[0].columns.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        }) : [];
        await saveDatabase(); // Save after each operation
        break;

      case 'selectAll':
        const selectResult = global.db.exec(payload.sql, payload.params || []);
        result = selectResult.length > 0 ? selectResult[0].values.map((row: any[]) => {
          const obj: any = {};
          selectResult[0].columns.forEach((col: string, idx: number) => {
            obj[col] = row[idx];
          });
          return obj;
        }) : [];
        // No need to save for read operations
        break;

      case 'run':
        global.db.run(payload.sql, payload.params || []);
        // Get last insert rowid
        const lastIdResult = global.db.exec('SELECT last_insert_rowid() as id');
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

    if (self?.postMessage) {
      self.postMessage({ id, type: 'success', result });
    }

  } catch (err) {
    error('Query error:', err);
    if (self?.postMessage) {
      self.postMessage({ 
        id, 
        type: 'error', 
        error: err instanceof Error ? err.message : String(err) 
      });
    }
    throw err;
  }
}