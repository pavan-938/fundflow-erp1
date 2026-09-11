import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ToastContext, type ToastContextValue } from './toast-context';

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastContextValue['toasts']>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (input: { tone: ToastContextValue['toasts'][number]['tone']; title: string; message?: string }) => {
      const id = crypto.randomUUID();
      setToasts((current) => [...current, { id, ...input }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      toasts,
      pushToast,
      dismissToast,
    }),
    [toasts, pushToast, dismissToast],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
