/**
 * useAsync Hook - Prevent memory leaks and handle async operations safely
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
): [AsyncState<T>, () => void] {
  const [state, setState] = useState<AsyncState<T>>({
    loading: immediate,
  });
  
  const isMounted = useRef(true);
  const abortController = useRef<AbortController>();
  
  const execute = useCallback(() => {
    // Cancel any pending request
    if (abortController.current) {
      abortController.current.abort();
    }
    
    // Create new abort controller
    abortController.current = new AbortController();
    
    setState({ loading: true });
    
    asyncFunction()
      .then((data) => {
        if (isMounted.current) {
          setState({ data, loading: false });
        }
      })
      .catch((error) => {
        if (isMounted.current && error.name !== 'AbortError') {
          setState({ error, loading: false });
        }
      });
  }, [asyncFunction]);
  
  useEffect(() => {
    if (immediate) {
      execute();
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [execute, immediate]);
  
  return [state, execute];
}

// Hook for debounced values
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

// Hook for throttled callbacks
export function useThrottle(callback: Function, delay: number) {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);
}
