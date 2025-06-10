import { useState, useCallback } from 'react';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastOptions[]>([]);

  const toast = useCallback(({ title, description, variant = 'default' }: ToastOptions) => {
    setToasts((prev) => [...prev, { title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  }, []);

  return { toast, toasts };
}; 