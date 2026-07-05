'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToastMessage } from '@/lib/toast';

const iconByType = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<Required<ToastMessage>[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const toast = (event as CustomEvent<ToastMessage>).detail;
      const nextToast = {
        id: toast.id || crypto.randomUUID(),
        title: toast.title,
        description: toast.description || '',
        type: toast.type || 'info',
      };
      setToasts((current) => [nextToast, ...current].slice(0, 4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== nextToast.id));
      }, 4500);
    };

    window.addEventListener('noa-toast', onToast);
    return () => window.removeEventListener('noa-toast', onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconByType[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-lg',
              toast.type === 'success' && 'border-success/30',
              toast.type === 'error' && 'border-destructive/30',
              toast.type === 'info' && 'border-border'
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0',
                toast.type === 'success' && 'text-success',
                toast.type === 'error' && 'text-destructive',
                toast.type === 'info' && 'text-primary'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              {toast.description && <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>}
            </div>
            <button
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
