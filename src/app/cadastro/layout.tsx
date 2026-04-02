import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastro Cliente — Bendita",
  description: "Faça seu cadastro com a IZA, assistente virtual da Bendita",
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
