import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useHotkeysPos } from '@/hooks/use-hotkeys-pos';

// Mock the react-hotkeys-hook
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: vi.fn(),
}));

const mockUseHotkeys = vi.mocked(require('react-hotkeys-hook').useHotkeys);

describe('useHotkeysPos', () => {
  const mockHandlers = {
    onAddProduct: vi.fn(),
    onOpenCart: vi.fn(),
    onCheckout: vi.fn(),
    onClearCart: jest.fn(),
    onSearch: jest.fn(),
    onNextProduct: jest.fn(),
    onPrevProduct: jest.fn(),
    onQuantityChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHotkeys.mockClear();
  });

  it('should register all hotkeys correctly', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // Verify all hotkey combinations are registered
    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'Enter, space',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'ctrl+shift+c, cmd+shift+c',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'ctrl+shift+p, cmd+shift+p',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'escape',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'ctrl+k, cmd+k',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'ArrowRight, ArrowDown',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'ArrowLeft, ArrowUp',
      expect.any(Function),
      expect.objectContaining({ preventDefault: true })
    );
  });

  it('should handle Enter/Space for adding product', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // Find the Enter/Space handler call
    const enterSpaceCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'Enter, space'
    );
    
    expect(enterSpaceCall).toBeDefined();
    
    // Simulate pressing Enter
    act(() => {
      enterSpaceCall![1]();
    });

    expect(mockHandlers.onAddProduct).toHaveBeenCalled();
  });

  it('should handle cart shortcut', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // Find the cart shortcut handler
    const cartCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ctrl+shift+c, cmd+shift+c'
    );
    
    expect(cartCall).toBeDefined();
    
    act(() => {
      cartCall![1]();
    });

    expect(mockHandlers.onOpenCart).toHaveBeenCalled();
  });

  it('should handle checkout shortcut', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    const checkoutCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ctrl+shift+p, cmd+shift+p'
    );
    
    expect(checkoutCall).toBeDefined();
    
    act(() => {
      checkoutCall![1]();
    });

    expect(mockHandlers.onCheckout).toHaveBeenCalled();
  });

  it('should handle escape for clearing cart', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    const escapeCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'escape'
    );
    
    expect(escapeCall).toBeDefined();
    
    act(() => {
      escapeCall![1]();
    });

    expect(mockHandlers.onClearCart).toHaveBeenCalled();
  });

  it('should handle search shortcut', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    const searchCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ctrl+k, cmd+k'
    );
    
    expect(searchCall).toBeDefined();
    
    act(() => {
      searchCall![1]();
    });

    expect(mockHandlers.onSearch).toHaveBeenCalled();
  });

  it('should handle navigation shortcuts', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // Test next product navigation
    const nextCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ArrowRight, ArrowDown'
    );
    
    expect(nextCall).toBeDefined();
    
    act(() => {
      nextCall![1]();
    });

    expect(mockHandlers.onNextProduct).toHaveBeenCalled();

    // Test previous product navigation
    const prevCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ArrowLeft, ArrowUp'
    );
    
    expect(prevCall).toBeDefined();
    
    act(() => {
      prevCall![1]();
    });

    expect(mockHandlers.onPrevProduct).toHaveBeenCalled();
  });

  it('should handle number keys for quantity changes', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // Test number key handlers (1-9)
    for (let i = 1; i <= 9; i++) {
      const numberCall = mockUseHotkeys.mock.calls.find(call => 
        call[0] === i.toString()
      );
      
      expect(numberCall).toBeDefined();
      
      act(() => {
        numberCall![1]();
      });

      expect(mockHandlers.onQuantityChange).toHaveBeenCalledWith(i);
    }
  });

  it('should work with optional handlers', () => {
    const partialHandlers = {
      onAddProduct: jest.fn(),
    };

    // Should not throw when some handlers are missing
    expect(() => {
      renderHook(() => useHotkeysPos(partialHandlers));
    }).not.toThrow();
  });

  it('should prevent default browser behavior', () => {
    renderHook(() => useHotkeysPos(mockHandlers));

    // All hotkey registrations should have preventDefault: true
    mockUseHotkeys.mock.calls.forEach(call => {
      const options = call[2];
      expect(options).toHaveProperty('preventDefault', true);
    });
  });

  it('should handle disabled state', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useHotkeysPos(mockHandlers, { enabled }),
      { initialProps: { enabled: true } }
    );

    // First render with enabled: true
    expect(mockUseHotkeys).toHaveBeenCalled();

    // Clear previous calls
    mockUseHotkeys.mockClear();

    // Re-render with enabled: false
    rerender({ enabled: false });

    // Should register hotkeys with enabled: false in options
    mockUseHotkeys.mock.calls.forEach(call => {
      const options = call[2];
      expect(options).toHaveProperty('enabled', false);
    });
  });

  it('should handle scoped hotkeys', () => {
    const scope = 'pos-grid';
    
    renderHook(() => useHotkeysPos(mockHandlers, { scope }));

    // All hotkey registrations should include the scope
    mockUseHotkeys.mock.calls.forEach(call => {
      const options = call[2];
      expect(options).toHaveProperty('scopes', [scope]);
    });
  });

  it('should support custom key combinations', () => {
    const customHandlers = {
      ...mockHandlers,
      onCustomAction: jest.fn(),
    };

    const customKeys = {
      addProduct: 'ctrl+a',
      openCart: 'alt+c',
    };

    renderHook(() => useHotkeysPos(customHandlers, { customKeys }));

    // Should register custom key combinations
    const customAddCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'ctrl+a'
    );
    expect(customAddCall).toBeDefined();

    const customCartCall = mockUseHotkeys.mock.calls.find(call => 
      call[0] === 'alt+c'
    );
    expect(customCartCall).toBeDefined();
  });
});