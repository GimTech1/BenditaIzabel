"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/** Textos curtos não precisam de “Ler mais”. */
const LONG_TEXT = 118;

interface MenuItemDescriptionProps {
  text: string;
  /** compacto = menos padding (ex.: carrinho) */
  variant?: "default" | "compact";
  className?: string;
}

export function MenuItemDescription({
  text,
  variant = "default",
  className,
}: MenuItemDescriptionProps) {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const [expanded, setExpanded] = useState(false);
  const needsToggle = trimmed.length > LONG_TEXT;

  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-xl border border-gold-400/20",
        "bg-gradient-to-br from-gold-400/[0.09] via-brand-500/[0.04] to-transparent",
        "shadow-[inset_0_1px_0_0_rgba(255,196,0,0.06)]",
        isCompact ? "px-2.5 py-2" : "px-3.5 py-3 sm:px-4 sm:py-3.5",
        className
      )}
    >
      <div
        className={cn(
          "mb-1.5 flex items-center gap-1.5 font-bold uppercase tracking-wider text-gold-400",
          isCompact ? "text-[9px]" : "text-[10px] sm:text-[11px]"
        )}
      >
        <Sparkles
          className={cn("shrink-0 text-gold-400/90", isCompact ? "h-3 w-3" : "h-3.5 w-3.5")}
          strokeWidth={2}
          aria-hidden
        />
        Sobre este item
      </div>
      <p
        className={cn(
          "text-text-secondary",
          isCompact ? "text-xs leading-relaxed" : "text-[0.9375rem] leading-[1.7] sm:text-base",
          !expanded && needsToggle && "line-clamp-4"
        )}
      >
        {trimmed}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className={cn(
            "mt-2 inline-flex items-center gap-1 font-semibold text-gold-400 transition-colors",
            "hover:text-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40 rounded",
            isCompact ? "text-[11px]" : "text-xs"
          )}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              Ler mais
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
