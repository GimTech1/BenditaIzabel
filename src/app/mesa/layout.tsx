import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cardápio — Bendita",
  description: "Faça seu pedido na mesa",
};

export default function MesaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
