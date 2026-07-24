"use client";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info" | "danger";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  duration: number;
  createdAt: number;
};

const toneMeta: Record<
  ToastTone,
  { accent: string; soft: string; label: string; Icon: typeof Check }
> = {
  success: {
    accent: "#059669",
    soft: "#ecfdf5",
    label: "LISTO",
    Icon: Check,
  },
  error: {
    accent: "#e11d48",
    soft: "#fff1f2",
    label: "ERROR",
    Icon: AlertTriangle,
  },
  danger: {
    accent: "#be123c",
    soft: "#fff1f2",
    label: "AVISO",
    Icon: AlertTriangle,
  },
  info: {
    accent: "#0369a1",
    soft: "#f0f9ff",
    label: "INFO",
    Icon: Info,
  },
};

function ToastCard({
  item,
  onDismiss,
  index,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
  index: number;
}) {
  const meta = toneMeta[item.tone];
  const Icon = meta.Icon;
  const [progress, setProgress] = useState(1);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 1 - elapsed / item.duration));
    }, 40);
    return () => window.clearInterval(id);
  }, [item.duration, item.id]);

  function handleClose() {
    setLeaving(true);
    window.setTimeout(() => onDismiss(item.id), 320);
  }

  return (
    <div
      className={`magtape ${leaving ? "magtape--peel" : ""}`}
      style={
        {
          "--tape-accent": meta.accent,
          "--tape-soft": meta.soft,
          "--tape-progress": String(progress),
          animationDelay: `${index * 55}ms`,
        } as CSSProperties
      }
      role="status"
    >
      <div className="magtape__hook" aria-hidden>
        <span />
        <span />
      </div>
      <div className="magtape__fold" aria-hidden />
      <div className="magtape__stripe" aria-hidden />
      <div className="magtape__inner">
        <span className="magtape__badge">
          <Icon size={15} strokeWidth={2.5} />
        </span>
        <div className="magtape__copy">
          <div className="magtape__row">
            <span className="magtape__tag">{meta.label}</span>
            {item.title ? (
              <p className="magtape__title">{item.title}</p>
            ) : null}
          </div>
          <p className="magtape__msg">{item.message}</p>
        </div>
        <button
          type="button"
          className="magtape__close"
          onClick={handleClose}
          aria-label="Cerrar"
        >
          <X size={14} />
        </button>
      </div>
      <div className="magtape__timer" aria-hidden />
      <div className="magtape__shadow" aria-hidden />
    </div>
  );
}

export function ToastViewport({
  toasts,
  onDismiss,
  confirm,
  onConfirmClose,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  confirm: {
    id: string;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    tone: ToastTone;
    resolve: (value: boolean) => void;
  } | null;
  onConfirmClose: (value: boolean) => void;
}) {
  const confirmMeta = confirm ? toneMeta[confirm.tone] : null;
  const ConfirmIcon = confirmMeta?.Icon;

  return (
    <>
      <div
        className="magtape-stack"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((item, index) => (
          <ToastCard
            key={item.id}
            item={item}
            index={index}
            onDismiss={onDismiss}
          />
        ))}
      </div>

      {confirm && confirmMeta && ConfirmIcon ? (
        <div className="magtape-confirm-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="magtape-confirm-backdrop"
            aria-label="Cerrar"
            onClick={() => onConfirmClose(false)}
          />
          <div
            className="magtape magtape--confirm"
            style={
              {
                "--tape-accent": confirmMeta.accent,
                "--tape-soft": confirmMeta.soft,
                "--tape-progress": "1",
              } as CSSProperties
            }
          >
            <div className="magtape__hook" aria-hidden>
              <span />
              <span />
            </div>
            <div className="magtape__fold" aria-hidden />
            <div className="magtape__stripe" aria-hidden />
            <div className="magtape__inner magtape__inner--confirm">
              <span className="magtape__badge magtape__badge--lg">
                <ConfirmIcon size={20} strokeWidth={2.4} />
              </span>
              <div className="magtape__copy">
                <p className="magtape__tag">CONFIRMACIÓN</p>
                <h3 className="magtape__title magtape__title--lg">
                  {confirm.title}
                </h3>
                <p className="magtape__msg magtape__msg--lg">
                  {confirm.message}
                </p>
              </div>
              <div className="magtape__actions">
                <button
                  type="button"
                  className="magtape__btn magtape__btn--ghost"
                  onClick={() => onConfirmClose(false)}
                >
                  {confirm.cancelLabel}
                </button>
                <button
                  type="button"
                  className="magtape__btn magtape__btn--solid"
                  onClick={() => onConfirmClose(true)}
                >
                  {confirm.confirmLabel}
                </button>
              </div>
            </div>
            <div className="magtape__shadow" aria-hidden />
          </div>
        </div>
      ) : null}
    </>
  );
}
