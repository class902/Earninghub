import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Enterprise Form History Hook — Ctrl+Z / Cmd+Z support
 * Tracks state snapshots and allows instant undo/redo.
 */
export function useFormHistory<T>(initial: T, maxHistory = 50) {
  const [stack, setStack] = useState<T[]>([initial]);
  const [cursor, setCursor] = useState(0);
  const skipRef = useRef(false); // Prevents undo/redo from pushing to history

  const current = stack[cursor];
  const canUndo = cursor > 0;
  const canRedo = cursor < stack.length - 1;

  /** Push a new state snapshot (call after any significant state change) */
  const push = useCallback(
    (state: T) => {
      if (skipRef.current) return;
      setStack(prev => {
        const trimmed = prev.slice(0, cursor + 1);
        const next = [...trimmed, state];
        return next.length > maxHistory ? next.slice(next.length - maxHistory) : next;
      });
      setCursor(c => Math.min(c + 1, maxHistory - 1));
    },
    [cursor, maxHistory],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;
    skipRef.current = true;
    setCursor(c => c - 1);
    setTimeout(() => { skipRef.current = false; }, 0);
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    skipRef.current = true;
    setCursor(c => c + 1);
    setTimeout(() => { skipRef.current = false; }, 0);
  }, [canRedo]);

  // Keyboard Ctrl+Z / Cmd+Z and Ctrl+Shift+Z / Cmd+Y
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo(); }
      if (e.key === 'y')                 { e.preventDefault(); redo(); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return { current, push, undo, redo, canUndo, canRedo, cursor };
}
