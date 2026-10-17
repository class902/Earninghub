import { useState, useCallback, useRef } from 'react';

/**
 * Prevents double-clicks / double-taps on async actions.
 * Returns [isProcessing, wrappedHandler].
 */
export function useAsyncAction<T extends (...args: any[]) => Promise<any>>(
  handler: T,
  { minDelay = 300 }: { minDelay?: number } = {}
): [boolean, (...args: Parameters<T>) => Promise<void>] {
  const [processing, setProcessing] = useState(false);
  const lockRef = useRef(false);

  const wrapped = useCallback(
    async (...args: Parameters<T>) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setProcessing(true);
      try {
        await handler(...args);
      } finally {
        setTimeout(() => {
          lockRef.current = false;
          setProcessing(false);
        }, minDelay);
      }
    },
    [handler, minDelay]
  );

  return [processing, wrapped];
}

/**
 * Safe image src with fallback — returns props for an <img>.
 */
export function useSafeImage(src: string | undefined | null) {
  const [failed, setFailed] = useState(false);
  return {
    src: (!src || failed) ? undefined : src,
    onError: () => setFailed(true),
    failed: !src || failed,
  };
}
