import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const heightClass: Record<Size, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-11",
};

interface BrandMarkProps {
  className?: string;
  size?: Size;
}

/** Ícone oficial “B” (verde #018B45) — pasta Branding / public/brand/mark-green.svg */
export function BrandMark({ className, size = "md" }: BrandMarkProps) {
  return (
    <img
      src="/brand/mark-green.svg"
      alt="Bendita"
      width={182}
      height={276}
      className={cn("w-auto object-contain object-bottom", heightClass[size], className)}
      decoding="async"
    />
  );
}
