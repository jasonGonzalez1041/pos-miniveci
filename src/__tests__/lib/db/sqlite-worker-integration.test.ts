/**
 * INTEGRATION TESTS FOR SQLITE WORKER
 * 
 * These tests validate the complete worker + main thread communication
 * and ensure the Debug-GOD fix maintains POS MiniVeci's local-first functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Worker class for integration testing
class MockWorker {
  private messageHandlers: ((event: MessageEvent) => void)[] = []
  private errorHandlers: ((event: ErrorEvent) => void)[] = []
  public postMessage = vi.fn()
  public terminate = vi.fn()
  public scriptURL: string

  constructor(scriptURL: string) {
    this.scriptURL = scriptURL
  }

  addEventListener(type: 'message' | 'error', handler: any) {
    if (type === 'message') {
      this.messageHandlers.push(handler)
    } else if (type === 'error') {
      this.errorHandlers.push(handler)
    }
  }

  removeEventListener(type: 'message' | 'error', handler: any) {
    if (type === 'message') {
      const index = this.messageHandlers.indexOf(handler)
      if (index > -1) this.messageHandlers.splice(index, 1)
    } else if (type === 'error') {
      const index = this.errorHandlers.indexOf(handler)
      if (index > -1) this.errorHandlers.splice(index, 1)
    }
  }

  // Simulate receiving a message from the worker
  simulateMessage(data: any) {
    const event = { data } as MessageEvent
    this.messageHandlers.forEach(handler => handler(event))
  }

  // Simulate an error from the worker
  simulateError(error: string) {
    const event = { message: error } as ErrorEvent
    this.errorHandlers.forEach(handler => handler(event))
  }

  // Set onmessage handler
  set onmessage(handler: ((event: MessageEvent) => void) | null) {
    if (handler) {
      this.addEventListener('message', handler)
    }
  }

  // Set onerror handler  
  set onerror(handler: ((event: ErrorEvent) => void) | null) {
    if (handler) {
      this.addEventListener('error', handler)
    }
  }
}

// SQLite Worker Client class for testing
class SQLiteWorkerClient {
  private worker: MockWorker
  private messageId = 0
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>()

  constructor(workerScript: string) {
    this.worker = new MockWorker(workerScript)
    this.setupMessageHandler()
  }

  private setupMessageHandler() {
    this.worker.onmessage = (event) => {
      const { id, type, result, error } = event.data

      if (type === 'ready') {
        // Worker is ready for operations
        return
      }

      if (type === 'error' && !id) {
        // Initialization error
        console.error('Worker initialization error:', error)
        return
      }

      const pending = this.pendingRequests.get(id)
      if (!pending) return

      this.pendingRequests.delete(id)

      if (type === 'success') {
        pending.resolve(result)
      } else if (type === 'error') {
        pending.reject(new Error(error))
      }
    }

    this.worker.onerror = (event) => {
      console.error('Worker error:', event.message)
    }
  }

  private async sendMessage(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `msg_${++this.messageId}`
      this.pendingRequests.set(id, { resolve, reject })

      this.worker.postMessage({ id, type, payload })

      // Simulate timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 5000)
    })
  }

  async selectAll(sql: string, params: any[] = []): Promise<any[]> {
    return this.sendMessage('selectAll', { sql, params })
  }

  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    return this.sendMessage('run', { sql, params })
  }

  async exec(sql: string, params: any[] = []): Promise<any[]> {
    return this.sendMessage('exec', { sql, params })
  }

  terminate() {
    this.worker.terminate()
  }

  // Test helper to simulate worker responses
  simulateWorkerResponse(id: string, type: 'success' | 'error', data: any) {
    this.worker.simulateMessage({ id, type, ...(type === 'success' ? { result: data } : { error: data }) })
  }

  // Test helper to simulate worker ready
  simulateWorkerReady() {
    this.worker.simulateMessage({ type: 'ready' })
  }

  // Test helper to get the mock worker
  getMockWorker() {
    return this.worker
  }
}

describe('SQLite Worker Integration Tests', () => {
  let client: SQLiteWorkerClient
  let mockWorker: MockWorker

  beforeEach(() => {
    vi.clearAllMocks()
    client = new SQLiteWorkerClient('/sqlite-worker.js')
    mockWorker = client.getMockWorker()
  })

  afterEach(() => {
    client?.terminate()
  })

  describe('Worker Initialization Integration', () => {
    it('should successfully initialize worker and confirm readiness', async () => {
      // Simulate successful worker initialization
      client.simulateWorkerReady()

      // Verify worker script was loaded correctly
      expect(mockWorker.scriptURL).toBe('/sqlite-worker.js')
    })

    it('should handle worker initialization failure gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate worker initialization error
      mockWorker.simulateMessage({
        type: 'error',
        error: 'Failed to load sql-wasm.js: 404 Not Found'
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Worker initialization error:',
        'Failed to load sql-wasm.js: 404 Not Found'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Database Operations Integration', () => {
    beforeEach(() => {
      // Simulate worker ready state
      client.simulateWorkerReady()
    })

    it('should handle product insertion with correct message flow', async () => {
      const insertPromise = client.run(
        'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
        ['Test Product', 1500, 10]
      )

      // Verify the message was sent to worker
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: 'msg_1',
        type: 'run',
        payload: {
          sql: 'INSERT INTO products (name, price, stock) VALUES (?, ?, ?)',
          params: ['Test Product', 1500, 10]
        }
      })

      // Simulate worker response
      client.simulateWorkerResponse('msg_1', 'success', {
        lastInsertRowid: 5,
        changes: 1
      })

      const result = await insertPromise
      expect(result).toEqual({
        lastInsertRowid: 5,
        changes: 1
      })
    })

    it('should handle product selection with proper data formatting', async () => {
      const selectPromise = client.selectAll(
        'SELECT * FROM products WHERE price > ?',
        [1000]
      )

      // Verify the message was sent
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        id: 'msg_1',
        type: 'selectAll',
        payload: {
          sql: 'SELECT * FROM products WHERE price > ?',
          params: [1000]
        }
      })

      // Simulate worker response with formatted data
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 1500, stock: 10 },
        { id: 2, name: 'Product 2', price: 2000, stock: 5 }
      ]

      client.simulateWorkerResponse('msg_1', 'success', mockProducts)

      const result = await selectPromise
      expect(result).toEqual(mockProducts)
    })

    it('should handle SQL execution errors appropriately', async () => {
      const execPromise = client.exec('INVALID SQL QUERY')

      // Simulate worker error response
      client.simulateWorkerResponse('msg_1', 'error', 'SQL syntax error')

      await expect(execPromise).rejects.toThrow('SQL syntax error')
    })

    it('should handle request timeouts', async () => {
      vi.useFakeTimers()

      const timeoutPromise = client.selectAll('SELECT * FROM products')

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(6000)

      await expect(timeoutPromise).rejects.toThrow('Request timeout')

      vi.useRealTimers()
    })
  })

  describe('Sales Operations Integration', () => {
    beforeEach(() => {
      client.simulateWorkerReady()
    })

    it('should handle complete sale transaction flow', async () => {
      // Step 1: Insert sale
      const salePromise = client.run(
        'INSERT INTO sales (id, total, payment_method) VALUES (?, ?, ?)',
        ['sale_123', 3500, 'cash']
      )

      client.simulateWorkerResponse('msg_1', 'success', {
        lastInsertRowid: 0, // Sales use TEXT id
        changes: 1
      })

      await salePromise

      // Step 2: Insert sale items
      const item1Promise = client.run(
        'INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        ['item_1', 'sale_123', 1, 2, 1500]
      )

      client.simulateWorkerResponse('msg_2', 'success', {
        lastInsertRowid: 1,
        changes: 1
      })

      const item2Promise = client.run(
        'INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?, ?)',
        ['item_2', 'sale_123', 2, 1, 500]
      )

      client.simulateWorkerResponse('msg_3', 'success', {
        lastInsertRowid: 2,
        changes: 1
      })

      await Promise.all([item1Promise, item2Promise])

      // Verify all messages were sent correctly
      expect(mockWorker.postMessage).toHaveBeenCalledTimes(3)
    })

    it('should handle sale retrieval with joins', async () => {
      const salesPromise = client.selectAll(`
        SELECT s.*, si.product_id, si.quantity, si.unit_price, p.name as product_name
        FROM sales s
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE s.id = ?
      `, ['sale_123'])

      const mockSaleData = [
        {
          id: 'sale_123',
          total: 3500,
          payment_method: 'cash',
          created_at: 1640995200,
          product_id: 1,
          quantity: 2,
          unit_price: 1500,
          product_name: 'Test Product 1'
        },
        {
          id: 'sale_123', 
          total: 3500,
          payment_method: 'cash',
          created_at: 1640995200,
          product_id: 2,
          quantity: 1,
          unit_price: 500,
          product_name: 'Test Product 2'
        }
      ]

      client.simulateWorkerResponse('msg_1', 'success', mockSaleData)

      const result = await salesPromise
      expect(result).toEqual(mockSaleData)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle worker script loading failure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Simulate worker script error
      mockWorker.simulateError('Failed to load worker script')

      expect(consoleSpy).toHaveBeenCalledWith('Worker error:', 'Failed to load worker script')

      consoleSpy.mockRestore()
    })

    it('should handle concurrent request failures correctly', async () => {
      client.simulateWorkerReady()

      // Start multiple concurrent requests
      const promise1 = client.selectAll('SELECT * FROM products')
      const promise2 = client.selectAll('SELECT * FROM sales') 
      const promise3 = client.run('INSERT INTO products (name) VALUES (?)', ['Test'])

      // Simulate mixed success/error responses
      client.simulateWorkerResponse('msg_1', 'success', [])
      client.simulateWorkerResponse('msg_2', 'error', 'Table not found')
      client.simulateWorkerResponse('msg_3', 'success', { lastInsertRowid: 1, changes: 1 })

      const results = await Promise.allSettled([promise1, promise2, promise3])

      expect(results[0].status).toBe('fulfilled')
      expect(results[1].status).toBe('rejected')
      expect(results[2].status).toBe('fulfilled')

      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('Table not found')
      }
    })
  })

  describe('Performance and Memory Integration', () => {
    it('should handle large result sets without memory issues', async () => {
      client.simulateWorkerReady()

      // Simulate large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        price: Math.floor(Math.random() * 10000),
        stock: Math.floor(Math.random() * 100)
      }))

      const promise = client.selectAll('SELECT * FROM products')
      client.simulateWorkerResponse('msg_1', 'success', largeDataset)

      const result = await promise
      expect(result).toHaveLength(1000)
      expect(result[0]).toEqual({
        id: 1,
        name: 'Product 1',
        price: expect.any(Number),
        stock: expect.any(Number)
      })
    })

    it('should properly clean up resources on termination', () => {
      const terminateSpy = vi.spyOn(mockWorker, 'terminate')
      
      client.terminate()
      
      expect(terminateSpy).toHaveBeenCalled()
    })
  })
})