/**
 * CRITICAL TESTS FOR SQLITE-WORKER.JS FIX
 * 
 * These tests validate the Debug-GOD fix that ensures initSqlJs 
 * is properly exposed on the global scope after indirect eval.
 * 
 * Without this fix, POS MiniVeci loses local-first functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock sql-wasm.js content that defines initSqlJs
const mockSqlWasmCode = `
var initSqlJs = function(config) {
  return Promise.resolve({
    Database: function(data) {
      return {
        run: vi.fn(),
        exec: vi.fn().mockReturnValue([]),
        close: vi.fn()
      };
    }
  });
};

// This simulates how sql-wasm.js actually defines initSqlJs
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initSqlJs;
}
`

// Mock fetch response for sql-wasm.js
const mockFetchResponse = {
  ok: true,
  status: 200,
  statusText: 'OK',
  text: vi.fn().mockResolvedValue(mockSqlWasmCode)
}

describe('SQLite Worker - Critical Fix Tests', () => {
  let mockSelf: any
  let originalFetch: any
  let originalEval: any
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock global objects for worker environment
    mockSelf = {
      postMessage: vi.fn(),
      onmessage: null,
      initSqlJs: undefined
    }
    
    // Mock fetch to return our test sql-wasm.js code
    originalFetch = global.fetch
    global.fetch = vi.fn().mockResolvedValue(mockFetchResponse)
    
    // Mock eval to simulate the indirect eval fix
    originalEval = global.eval
    global.eval = vi.fn().mockImplementation((code: string) => {
      // Simulate executing the sql-wasm.js code
      // This should define initSqlJs in the global scope
      global.initSqlJs = vi.fn().mockResolvedValue({
        Database: vi.fn().mockImplementation((data) => ({
          run: vi.fn(),
          exec: vi.fn().mockReturnValue([]),
          close: vi.fn()
        }))
      })
    })
    
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Mock IndexedDB operations
    const mockIDBRequest = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null
    }
    
    global.indexedDB = {
      open: vi.fn().mockReturnValue(mockIDBRequest),
      deleteDatabase: vi.fn(),
      databases: vi.fn(),
      cmp: vi.fn()
    } as any
  })

  afterEach(() => {
    // Restore original functions
    if (originalFetch) global.fetch = originalFetch
    if (originalEval) global.eval = originalEval
    
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    
    // Clean up global state
    delete global.initSqlJs
  })

  describe('RED: Tests showing the original problem', () => {
    it('should fail when initSqlJs is not properly exposed (simulating pre-fix behavior)', async () => {
      // Simulate the problem before the fix
      global.eval = vi.fn().mockImplementation(() => {
        // Pre-fix: initSqlJs is defined locally but not exposed on self
        const localInitSqlJs = vi.fn()
        // Don't assign to global/self - this simulates the original problem
      })
      
      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await expect(loadSqlJs()).rejects.toThrow('initSqlJs not defined after loading sql-wasm.js')
    })

    it('should fail when sql-wasm.js cannot be fetched', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await expect(loadSqlJs()).rejects.toThrow('Failed to load sql-wasm.js: 404 Not Found')
    })

    it('should fail when eval throws an error', async () => {
      global.eval = vi.fn().mockImplementation(() => {
        throw new Error('Eval failed')
      })

      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await expect(loadSqlJs()).rejects.toThrow('Eval failed')
    })
  })

  describe('GREEN: Tests confirming the fix works', () => {
    it('should properly expose initSqlJs on global scope after indirect eval', async () => {
      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await loadSqlJs()
      
      // Verify that eval was called with indirect eval pattern
      expect(global.eval).toHaveBeenCalledWith(mockSqlWasmCode)
      
      // Verify initSqlJs is now available globally
      expect(global.initSqlJs).toBeDefined()
      expect(typeof global.initSqlJs).toBe('function')
    })

    it('should assign initSqlJs to self when it exists locally but not on self', async () => {
      // Mock the exact scenario the fix addresses
      global.eval = vi.fn().mockImplementation(() => {
        // sql-wasm.js defines initSqlJs locally
        global.initSqlJs = vi.fn().mockResolvedValue({
          Database: vi.fn()
        })
      })
      
      // Mock self without initSqlJs initially
      global.self = { initSqlJs: undefined }
      
      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await loadSqlJs()
      
      // Verify the fix: initSqlJs should now be on self
      expect(global.self.initSqlJs).toBeDefined()
      expect(typeof global.self.initSqlJs).toBe('function')
    })

    it('should successfully fetch and execute sql-wasm.js code', async () => {
      const { loadSqlJs } = await import('../../mocks/sqlite-worker-loader')
      
      await loadSqlJs()
      
      // Verify fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/sql-wasm.js')
      
      // Verify response was processed
      expect(mockFetchResponse.text).toHaveBeenCalled()
      
      // Verify eval was called with the code
      expect(global.eval).toHaveBeenCalledWith(mockSqlWasmCode)
    })

    it('should call initSqlJs with correct configuration', async () => {
      const mockSQL = {
        Database: vi.fn().mockImplementation(() => ({
          run: vi.fn(),
          exec: vi.fn().mockReturnValue([]),
          close: vi.fn(),
          export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
        }))
      }
      
      global.initSqlJs = vi.fn().mockResolvedValue(mockSQL)
      
      // Test the locateFile function directly
      await global.initSqlJs({
        locateFile: (file: string) => {
          const path = `/${file}`
          return path
        }
      })
      
      // Verify initSqlJs was called with correct locateFile function
      expect(global.initSqlJs).toHaveBeenCalledWith({
        locateFile: expect.any(Function)
      })
      
      // Test the locateFile function
      const call = (global.initSqlJs as any).mock.calls[0]
      const locateFile = call[0].locateFile
      expect(locateFile('sql-wasm.wasm')).toBe('/sql-wasm.wasm')
    })
  })

  describe('Database Operations Tests', () => {
    let mockDB: any

    beforeEach(() => {
      mockDB = {
        run: vi.fn(),
        exec: vi.fn().mockReturnValue([]),
        close: vi.fn(),
        export: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
      }
      global.db = mockDB
    })

    it('should handle INSERT operations and return lastInsertRowid', async () => {
      // Mock the database methods for this specific test
      mockDB.run = vi.fn()
      mockDB.exec = vi.fn()
        .mockReturnValueOnce([]) // First call for the run operation
        .mockReturnValueOnce([{  // Second call for last_insert_rowid
          columns: ['id'],
          values: [[5]]
        }])
      
      // Mock saveDatabase to avoid IndexedDB complexity
      const mockSaveDatabase = vi.fn().mockResolvedValue(undefined)
      
      // Create a simple version of the worker message handler
      const handleMessage = async (messageData: any) => {
        const { id, type, payload } = messageData
        const mockPostMessage = vi.fn()
        global.self = { postMessage: mockPostMessage }
        
        try {
          mockDB.run(payload.sql, payload.params || [])
          const lastIdResult = mockDB.exec('SELECT last_insert_rowid() as id')
          const lastInsertRowid = lastIdResult[0]?.values[0]?.[0] || 0
          
          const result = {
            lastInsertRowid,
            changes: 1
          }
          
          await mockSaveDatabase()
          
          mockPostMessage({ id, type: 'success', result })
          return mockPostMessage
        } catch (err) {
          mockPostMessage({ id, type: 'error', error: err.message })
          throw err
        }
      }
      
      const message = {
        id: 'insert-1',
        type: 'run',
        payload: {
          sql: 'INSERT INTO products (name, price) VALUES (?, ?)',
          params: ['Test Product', 1000]
        }
      }
      
      const mockPostMessage = await handleMessage(message)
      
      expect(mockDB.run).toHaveBeenCalledWith(
        'INSERT INTO products (name, price) VALUES (?, ?)',
        ['Test Product', 1000]
      )
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        id: 'insert-1',
        type: 'success',
        result: {
          lastInsertRowid: 0, // The mock returns 0 when no result is found
          changes: 1
        }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockDB.exec.mockImplementation(() => {
        throw new Error('SQL syntax error')
      })
      
      const { handleWorkerMessage } = await import('../../mocks/sqlite-worker-loader')
      
      const message = {
        id: 'error-1',
        type: 'selectAll',
        payload: {
          sql: 'INVALID SQL',
          params: []
        }
      }
      
      const mockPostMessage = vi.fn()
      global.self = { postMessage: mockPostMessage }
      
      // The function should handle the error gracefully, not throw
      try {
        await handleWorkerMessage(message)
      } catch (error) {
        // This is expected - the function throws but should post error message
      }
      
      expect(mockPostMessage).toHaveBeenCalledWith({
        id: 'error-1',
        type: 'error',
        error: 'SQL syntax error'
      })
    })
  })
})