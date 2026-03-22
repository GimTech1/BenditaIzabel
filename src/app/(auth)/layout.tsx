import { BrandWordmark } from "@/components/brand/BrandWordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center gap-4">
        <BrandWordmark variant="light" className="h-11 sm:h-14 max-w-[min(92vw,24rem)]" />
        <p className="text-center text-sm text-text-secondary">Sistema de Gestão</p>
      </div>
      {children}
    </div>
  );
}
