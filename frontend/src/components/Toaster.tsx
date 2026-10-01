import { useEffect, useState } from "react";
import { onToast, type ToastPayload } from "../toast";

export function Toaster() {
  const [toasts, setToasts] = useState<ToastPayload[]>([]);

  useEffect(() => {
    const removeToast = (id: number) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleToast = (payload: ToastPayload) => {
      setToasts((prev) => [...prev, payload]);
      setTimeout(() => removeToast(payload.id), 4200);
    };

    return onToast(handleToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
