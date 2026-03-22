import { cn } from "@/lib/utils";

interface BrandWordmarkProps {
  /** `light` = traços brancos (fundo escuro). `dark` = verde oficial. */
  variant?: "light" | "dark";
  className?: string;
}

/** Logotipo completo “Bendita” — arquivos em public/brand/ */
export function BrandWordmark({
  variant = "dark",
  className,
}: BrandWordmarkProps) {
  const src =
    variant === "light" ? "/brand/wordmark-white.svg" : "/brand/wordmark-green.svg";

  return (
    <img
      src={src}
      alt="Bendita"
      width={838}
      height={348}
      className={cn(
        "h-10 w-auto max-w-[min(92vw,20rem)] object-contain object-center sm:h-12 sm:max-w-[22rem]",
        className
      )}
      decoding="async"
    />
  );
}
