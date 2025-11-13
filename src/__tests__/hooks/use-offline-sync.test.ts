import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/use-offline-sync';

// Mock dependencies
jest.mock('@/lib/db/sync', () => ({
  fullSync: jest.fn(),
  scheduleSyncDebounced: jest.fn(),
}));

jest.mock('@/lib/db/local-db', () => ({
  initLocalDb: jest.fn(),
}));

const mockFullSync = jest.mocked(require('@/lib/db/sync').fullSync);
const mockScheduleSyncDebounced = jest.mocked(require('@/lib/db/sync').scheduleSyncDebounced);
const mockInitLocalDb = jest.mocked(require('@/lib/db/local-db').initLocalDb);

// Mock console to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('useOfflineSync', () => {
  const originalNavigator = global.navigator;
  const originalWindow = global.window;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();

    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: {
        ...originalNavigator,
        onLine: true,
      },
    });

    // Mock window object
    Object.defineProperty(global, 'window', {
      writable: true,
      value: {
        ...originalWindow,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
    });

    // Mock successful DB initialization
    mockInitLocalDb.mockResolvedValue(undefined);
    mockFullSync.mockResolvedValue({ success: true, errors: [] });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    Object.defineProperty(global, 'navigator', { value: originalNavigator });
    Object.defineProperty(global, 'window', { value: originalWindow });
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(typeof result.current.triggerSync).toBe('function');
    });

    it('should initialize local database on mount', async () => {
      renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockInitLocalDb).toHaveBeenCalled();
    });

    it('should set initialized state after DB init', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle DB initialization errors', async () => {
      const error = new Error('DB init failed');
      mockInitLocalDb.mockRejectedValue(error);

      renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[useOfflineSync] Failed to initialize local DB:', 
        error
      );
    });

    it('should trigger initial sync after initialization', async () => {
      renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(mockFullSync).toHaveBeenCalled();
    });

    it('should not initialize if window is undefined (SSR)', () => {
      // Mock SSR environment
      Object.defineProperty(global, 'window', {
        value: undefined,
      });

      renderHook(() => useOfflineSync());

      expect(mockInitLocalDb).not.toHaveBeenCalled();
    });
  });

  describe('Online/Offline detection', () => {
    it('should set up online/offline event listeners', () => {
      renderHook(() => useOfflineSync());

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOfflineSync());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should handle going offline', () => {
      const { result } = renderHook(() => useOfflineSync());

      // Simulate offline event
      const offlineHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        call => call[0] === 'offline'
      )[1];

      act(() => {
        offlineHandler();
      });

      expect(result.current.isOnline).toBe(false);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[useOfflineSync] Connection lost, working offline'
      );
    });

    it('should handle going online and trigger sync', async () => {
      const { result } = renderHook(() => useOfflineSync());

      // First go offline
      act(() => {
        result.current.isOnline = false;
      });

      // Then simulate online event
      const onlineHandler = (window.addEventListener as jest.Mock).mock.calls.find(
        call => call[0] === 'online'
      )[1];

      await act(async () => {
        onlineHandler();
      });

      expect(result.current.isOnline).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[useOfflineSync] Connection restored, syncing...'
      );
      expect(mockFullSync).toHaveBeenCalled();
    });

    it('should respect navigator.onLine initial state', () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('Periodic sync', () => {
    it('should set up periodic sync when online and initialized', async () => {
      const { result } = renderHook(() => useOfflineSync());

      // Wait for initialization
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isOnline).toBe(true);

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockScheduleSyncDebounced).toHaveBeenCalledWith(1000);
    });

    it('should not sync periodically when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockScheduleSyncDebounced).not.toHaveBeenCalled();
    });

    it('should not sync periodically when not initialized', () => {
      mockInitLocalDb.mockImplementation(() => new Promise(() => {})); // Never resolves

      renderHook(() => useOfflineSync());

      // Fast forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockScheduleSyncDebounced).not.toHaveBeenCalled();
    });

    it('should clear periodic sync interval on unmount', async () => {
      const mockClearInterval = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      unmount();

      expect(mockClearInterval).toHaveBeenCalled();
    });
  });

  describe('Manual sync trigger', () => {
    it('should trigger sync when conditions are met', async () => {
      const { result } = renderHook(() => useOfflineSync());

      // Wait for initialization
      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear previous sync calls
      mockFullSync.mockClear();

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockFullSync).toHaveBeenCalled();
    });

    it('should not trigger sync when offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
      });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear previous sync calls
      mockFullSync.mockClear();

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockFullSync).not.toHaveBeenCalled();
    });

    it('should not trigger sync when already syncing', async () => {
      // Make fullSync take a long time
      mockFullSync.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Start first sync
      const firstSync = act(async () => {
        result.current.triggerSync();
      });

      // Try to start second sync while first is running
      await act(async () => {
        await result.current.triggerSync();
      });

      // Should only be called once (from initialization)
      expect(mockFullSync).toHaveBeenCalledTimes(1);
    });

    it('should not trigger sync when not initialized', async () => {
      mockInitLocalDb.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockFullSync).not.toHaveBeenCalled();
    });

    it('should handle sync success', async () => {
      mockFullSync.mockResolvedValue({ success: true, errors: [] });

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear previous calls
      mockFullSync.mockClear();
      mockConsoleLog.mockClear();

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[useOfflineSync] Sync successful:',
        { success: true, errors: [] }
      );
      expect(result.current.isSyncing).toBe(false);
    });

    it('should handle sync with errors', async () => {
      const syncResult = { success: false, errors: ['Error 1', 'Error 2'] };
      mockFullSync.mockResolvedValue(syncResult);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear previous calls
      mockFullSync.mockClear();
      mockConsoleError.mockClear();

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[useOfflineSync] Sync had errors:',
        ['Error 1', 'Error 2']
      );
    });

    it('should handle sync failure', async () => {
      const error = new Error('Sync failed');
      mockFullSync.mockRejectedValue(error);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      // Clear previous calls
      mockFullSync.mockClear();
      mockConsoleError.mockClear();

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[useOfflineSync] Sync failed:',
        error
      );
      expect(result.current.isSyncing).toBe(false);
    });
  });
});