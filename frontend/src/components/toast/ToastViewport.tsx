import { useToast } from './useToast';
import { Button } from '../ui/Button';

export function ToastViewport() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`} role="status">
          <div style={{ flex: 1 }}>
            <strong>{toast.title}</strong>
            {toast.message ? <p>{toast.message}</p> : null}
          </div>
          <Button variant="ghost" aria-label="Dismiss notification" onClick={() => dismissToast(toast.id)}>
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}
