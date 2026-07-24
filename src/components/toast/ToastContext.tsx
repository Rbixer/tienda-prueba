"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ToastViewport, type ToastItem, type ToastTone } from "./ToastViewport";

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ToastTone;
};

type ToastApi = {
  push: (input: {
    title?: string;
    message: string;
    tone?: ToastTone;
    duration?: number;
  }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
};

const ToastContext = createContext<ToastApi | null>(null);

let seq = 0;
function nextId() {
  seq += 1;
  return `toast-${Date.now()}-${seq}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    id: string;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: ToastTone;
    resolve: (value: boolean) => void;
  } | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: {
      title?: string;
      message: string;
      tone?: ToastTone;
      duration?: number;
    }) => {
      const id = nextId();
      const tone = input.tone ?? "info";
      const duration = input.duration ?? (tone === "error" ? 5200 : 3800);
      setToasts((prev) => [
        {
          id,
          title: input.title,
          message: input.message,
          tone,
          duration,
          createdAt: Date.now(),
        },
        ...prev,
      ].slice(0, 4));
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        id: nextId(),
        title: opts.title ?? "Confirmar acción",
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Aceptar",
        cancelLabel: opts.cancelLabel ?? "Cancelar",
        tone: opts.tone ?? "danger",
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message, title = "Listo") =>
        push({ message, title, tone: "success" }),
      error: (message, title = "Atención") =>
        push({ message, title, tone: "error" }),
      info: (message, title = "Aviso") =>
        push({ message, title, tone: "info" }),
      confirm,
    }),
    [push, confirm],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport
        toasts={toasts}
        onDismiss={dismiss}
        confirm={confirmState}
        onConfirmClose={closeConfirm}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
