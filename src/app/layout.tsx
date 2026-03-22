import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bendita - Sistema de Gestão",
  description: "Sistema de gestão e organização do Bendita Bar",
};

export const viewport: Viewport = {
  themeColor: "#018B45",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0c1512",
              color: "#f2faf6",
              border: "1px solid #1f3d32",
            },
          }}
        />
      </body>
    </html>
  );
}
