import { BrandWordmark } from "@/components/brand/BrandWordmark";
import { cn } from "@/lib/utils";

/**
 * Wordmark conforme tema: escuro = branco (IDV), claro = verde oficial.
 * Visibilidade via CSS + `data-theme` (definido pelo script em layout).
 */
export function AuthBranding({ className }: { className?: string }) {
  return (
    <>
      <BrandWordmark
        variant="light"
        className={cn("auth-wordmark--dark-bg", className)}
      />
      <BrandWordmark
        variant="dark"
        className={cn("auth-wordmark--light-bg", className)}
      />
    </>
  );
}
