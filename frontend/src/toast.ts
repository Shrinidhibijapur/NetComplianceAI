export type ToastKind = "success" | "error" | "info";
export interface ToastPayload {
  id: number;
  kind: ToastKind;
  message: string;
}

let counter = 0;
const TOAST_EVENT = "app:toast";

export function toast(message: string, kind: ToastKind = "info") {
  const payload: ToastPayload = { id: ++counter, kind, message };
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

export function onToast(handler: (payload: ToastPayload) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<ToastPayload>).detail);
  window.addEventListener(TOAST_EVENT, listener);
  return () => window.removeEventListener(TOAST_EVENT, listener);
}
