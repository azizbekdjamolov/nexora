"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = "", id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`h-11 w-full rounded-xl border bg-surface-raised px-4 text-sm text-text placeholder:text-text-muted/60 transition-colors focus:border-primary-500 focus:outline-none ${error ? "border-red-500/70" : "border-surface-border"} ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        className={`w-full rounded-xl border bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted/60 transition-colors focus:border-primary-500 focus:outline-none ${error ? "border-red-500/70" : "border-surface-border"} ${className}`}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});