"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          "h-10 w-full rounded-lg border bg-surface-2 px-3 text-sm text-text-primary",
          "placeholder:text-text-muted",
          "focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500",
          "transition-colors",
          error ? "border-red-500" : "border-border",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);

Input.displayName = "Input";
export { Input };
