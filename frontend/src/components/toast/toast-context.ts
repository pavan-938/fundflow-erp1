import { createContext } from 'react';
import type { ToastItem, ToastTone } from '../../types';

export type ToastContextValue = {
  toasts: ToastItem[];
  pushToast: (input: { tone: ToastTone; title: string; message?: string }) => void;
  dismissToast: (id: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
