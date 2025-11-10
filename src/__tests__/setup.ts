import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock the global fetch for worker tests
global.fetch = vi.fn()

// Mock Worker constructor
global.Worker = vi.fn().mockImplementation((scriptURL) => {
  return {
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
    scriptURL
  }
})

// Mock IndexedDB for worker persistence tests
const mockIDBDatabase = {
  transaction: vi.fn(),
  close: vi.fn(),
  createObjectStore: vi.fn(),
  deleteObjectStore: vi.fn()
}

const mockIDBObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  getKey: vi.fn(),
  getAll: vi.fn(),
  getAllKeys: vi.fn(),
  openCursor: vi.fn(),
  openKeyCursor: vi.fn()
}

const mockIDBTransaction = {
  objectStore: vi.fn().mockReturnValue(mockIDBObjectStore),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

const mockIDBRequest = {
  result: null,
  error: null,
  source: mockIDBObjectStore,
  transaction: mockIDBTransaction,
  readyState: 'done',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onsuccess: null,
  onerror: null
}

const mockIDBOpenDBRequest = {
  ...mockIDBRequest,
  onupgradeneeded: null,
  onblocked: null,
  onversionchange: null
}

global.indexedDB = {
  open: vi.fn().mockReturnValue(mockIDBOpenDBRequest),
  deleteDatabase: vi.fn().mockReturnValue(mockIDBRequest),
  databases: vi.fn(),
  cmp: vi.fn()
}

// Export mocks for test files
export { mockIDBDatabase, mockIDBObjectStore, mockIDBTransaction, mockIDBRequest }