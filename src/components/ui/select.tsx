"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, options, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          "h-10 w-full rounded-lg border bg-surface-2 px-3 text-sm text-text-primary",
          "focus:outline-none focus:ring-2 focus:ring-gold-400/50 focus:border-gold-500",
          "transition-colors appearance-none",
          error ? "border-red-500" : "border-border",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);

Select.displayName = "Select";
export { Select };
