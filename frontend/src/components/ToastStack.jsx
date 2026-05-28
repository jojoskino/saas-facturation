import { useEffect, useState } from "react";
import "../styles/toast-stack.css";

export default function ToastStack({ toasts, onDismiss }) {
  useEffect(() => {
    if (!toasts.length) return undefined;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => onDismiss?.(toast.id), toast.duration ?? 4200)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, onDismiss]);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-stack__item toast-stack__item--${toast.type || "info"}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export function useToasts() {
  const [toasts, setToasts] = useState([]);

  function pushToast(message, type = "success", duration) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  return { toasts, pushToast, dismissToast };
}
