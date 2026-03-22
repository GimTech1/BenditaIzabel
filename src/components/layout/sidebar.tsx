"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Columns3,
  Users,
  Package,
  DollarSign,
  FileText,
  Contact,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Quadros", href: "/trello", icon: Columns3 },
  { title: "Equipe", href: "/equipe", icon: Users },
  { title: "Estoque", href: "/estoque", icon: Package },
  { title: "Financeiro", href: "/financeiro", icon: DollarSign },
  { title: "Documentos", href: "/documentos", icon: FileText },
  { title: "Contatos", href: "/contatos", icon: Contact },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const navContent = (
    <>
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex h-11 w-11 shrink-0 items-end justify-center overflow-hidden rounded-xl border border-border bg-surface-2 pb-0.5">
          <BrandMark size="lg" className="h-10 translate-y-0.5" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold tracking-tight text-gold-400">
            Bendita
          </h1>
          <p className="text-xs text-text-muted">Sistema de Gestão</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-gold-400/10 text-gold-400"
                  : "text-text-secondary hover:bg-surface-3 hover:text-text-primary"
              )}
            >
              <item.icon size={20} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface-3 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-end justify-center overflow-hidden rounded-lg border border-border bg-surface-2 pb-px">
            <BrandMark size="sm" className="h-7 translate-y-px" />
          </div>
          <span className="font-bold text-gold-400">Bendita</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-text-secondary hover:bg-surface-3"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 z-50 w-64 flex flex-col border-r border-border bg-surface transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-border bg-surface">
        {navContent}
      </aside>
    </>
  );
}
