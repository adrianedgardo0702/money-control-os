export type ToastType = 'success' | 'error' | 'info';

export type ToastMessage = {
  id?: string;
  title: string;
  description?: string;
  type?: ToastType;
};

export const showToast = (toast: ToastMessage) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ToastMessage>('noa-toast', {
      detail: {
        id: crypto.randomUUID(),
        type: 'info',
        ...toast,
      },
    })
  );
};
