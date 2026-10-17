import { useRef } from 'react';
import { toast } from 'sonner';

interface UndoOptions {
  onUndo: () => Promise<void>;
  duration?: number; // ms — default 7000
  undoLabel?: string;
}

/**
 * Enterprise Undo Toast Hook
 * Shows a toast with a prominent "Undo" action button.
 * Clicking Undo fires the async reverse action, then toasts success.
 */
export function useUndoToast() {
  const pendingRef = useRef<(() => Promise<void>) | null>(null);

  function showUndoToast(
    message: string,
    { onUndo, duration = 7000, undoLabel = '↩️ Undo' }: UndoOptions,
  ) {
    pendingRef.current = onUndo;
    toast(message, {
      duration,
      action: {
        label: undoLabel,
        onClick: async () => {
          if (!pendingRef.current) return;
          try {
            await pendingRef.current();
            pendingRef.current = null;
            toast.success('Action undone ✓');
          } catch {
            toast.error('Failed to undo — please try manually');
          }
        },
      },
    });
  }

  return { showUndoToast };
}
