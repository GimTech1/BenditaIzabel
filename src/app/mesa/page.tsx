"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Minus,
  Plus,
  ShoppingBag,
  Send,
  Loader2,
  UtensilsCrossed,
  X,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/brand/BrandMark";
import { cn } from "@/lib/utils";
import {
  OFFICIAL_MENU_LABEL,
  OFFICIAL_MENU_PDF_PATH,
} from "@/lib/cardapio-official";
import { MenuItemDescription } from "@/components/cardapio/MenuItemDescription";
import type { MenuItem } from "@/lib/types";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function imgUnoptimized(url: string) {
  return url.includes("127.0.0.1") || url.includes("localhost");
}

async function apiPublic<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...opts,
    credentials: "omit",
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function MesaContent() {
  const searchParams = useSearchParams();
  const mesaParam = searchParams.get("mesa")?.trim() ?? "";

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLabel, setTableLabel] = useState(mesaParam);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    if (mesaParam) setTableLabel(mesaParam);
  }, [mesaParam]);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiPublic<MenuItem[]>("/api/cardapio/menu/public");
      setItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar cardápio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const categories = useMemo(() => {
    const s = new Set(items.map((i) => i.category));
    return [...s].sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (!categoryFilter) return items;
    return items.filter((i) => i.category === categoryFilter);
  }, [items, categoryFilter]);

  const cartLines = useMemo(() => {
    const lines: { item: MenuItem; qty: number }[] = [];
    for (const [id, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const item = items.find((i) => i.id === id);
      if (item) lines.push({ item, qty });
    }
    return lines;
  }, [cart, items]);

  const cartCount = cartLines.reduce((a, l) => a + l.qty, 0);
  const cartTotal = cartLines.reduce(
    (a, l) => a + l.item.price * l.qty,
    0
  );

  function addOne(id: string) {
    setCart((c) => ({
      ...c,
      [id]: Math.min(20, (c[id] ?? 0) + 1),
    }));
  }

  function subOne(id: string) {
    setCart((c) => {
      const next = { ...c };
      const q = (next[id] ?? 0) - 1;
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  }

  async function submitOrder() {
    const label = tableLabel.trim();
    if (!label) {
      toast.error("Informe o número da mesa");
      return;
    }
    if (cartLines.length === 0) {
      toast.error("Adicione itens ao pedido");
      return;
    }
    setSending(true);
    try {
      await apiPublic("/api/cardapio/orders", {
        method: "POST",
        body: JSON.stringify({
          table_label: label,
          customer_note: note.trim() || null,
          lines: cartLines.map(({ item, qty }) => ({
            menu_item_id: item.id,
            quantity: qty,
          })),
        }),
      });
      toast.success("Pedido enviado! O garçom foi avisado.");
      setCart({});
      setNote("");
      setCartOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen pb-32",
        "bg-surface bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(1,139,69,0.2),transparent_55%)]"
      )}
    >
      <header className="sticky top-0 z-20 border-b border-border/80 bg-surface/90 shadow-sm shadow-black/20 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-2xl border border-gold-400/25 bg-surface-2 shadow-inner shadow-black/20 pb-0.5">
              <BrandMark size="lg" className="h-11 translate-y-0.5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-extrabold tracking-tight text-gold-400 sm:text-2xl">
                Bendita
              </h1>
              <p className="text-sm text-text-secondary">
                Cardápio digital · Toque para pedir
              </p>
            </div>
            <UtensilsCrossed
              className="hidden h-10 w-10 shrink-0 text-gold-400/35 sm:block"
              strokeWidth={1.25}
            />
          </div>

          <div className="mt-4 space-y-3">
            <a
              href={OFFICIAL_MENU_PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border border-gold-400/35",
                "bg-gradient-to-r from-gold-400/15 via-gold-400/10 to-brand-500/10 px-4 py-3.5",
                "text-sm font-semibold text-gold-400 shadow-sm transition-all",
                "hover:border-gold-400/50 hover:from-gold-400/25 active:scale-[0.99]"
              )}
            >
              <FileText className="h-5 w-5 shrink-0" />
              {OFFICIAL_MENU_LABEL}
            </a>
            <Input
              id="mesa-label"
              label="Sua mesa"
              placeholder="Ex: 12, varanda 3, balcão"
              value={tableLabel}
              onChange={(e) => setTableLabel(e.target.value)}
              className="h-12 rounded-xl border-border-light bg-surface-2 text-base"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6">
        <p className="mb-5 text-center text-xs leading-relaxed text-text-muted sm:text-sm">
          Preços completos no PDF acima. Cada item pode trazer ingredientes e
          detalhes no bloco <span className="text-gold-400/90">Sobre este item</span>.
        </p>

        {categories.length > 1 && (
          <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={cn(
                "shrink-0 snap-start rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                categoryFilter === null
                  ? "bg-gold-400 text-brand-900 shadow-md shadow-gold-400/25"
                  : "border border-border bg-surface-2 text-text-secondary hover:border-gold-400/30 hover:text-text-primary"
              )}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  "shrink-0 snap-start rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                  categoryFilter === c
                    ? "bg-gold-400 text-brand-900 shadow-md shadow-gold-400/25"
                    : "border border-border bg-surface-2 text-text-secondary hover:border-gold-400/30 hover:text-text-primary"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-12 w-12 animate-spin text-gold-400" />
            <p className="text-sm text-text-muted">Carregando cardápio…</p>
          </div>
        ) : items.length === 0 ? (
          <p className="py-20 text-center text-text-muted">
            Cardápio em atualização. Volte em instantes.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 pb-4 sm:grid-cols-2 lg:gap-6">
            {filtered.map((item) => {
              const q = cart[item.id] ?? 0;
              const hasImg = Boolean(item.image_url);

              return (
                <article
                  key={item.id}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300",
                    hasImg
                      ? "border-border/60 bg-surface-2/95 shadow-xl shadow-black/30 hover:border-gold-400/35 hover:shadow-gold-400/[0.07]"
                      : "border-border/80 bg-surface-2/98 hover:border-gold-400/25 hover:shadow-lg hover:shadow-black/20"
                  )}
                >
                  {hasImg ? (
                    <div className="relative aspect-[5/4] w-full overflow-hidden bg-surface-3 sm:aspect-[4/3]">
                      <Image
                        src={item.image_url!}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                        unoptimized={imgUnoptimized(item.image_url!)}
                        priority={false}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25"
                        aria-hidden
                      />
                      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-3 sm:p-4">
                        <Badge
                          variant="default"
                          className="max-w-[65%] truncate border-0 bg-black/45 text-[10px] font-semibold text-white backdrop-blur-md sm:text-xs"
                        >
                          {item.category}
                        </Badge>
                        <span className="shrink-0 rounded-xl bg-black/55 px-3 py-1.5 text-base font-bold tabular-nums text-gold-400 backdrop-blur-md sm:text-lg">
                          {formatBRL(item.price)}
                        </span>
                      </div>
                      {q > 0 ? (
                        <div className="absolute right-3 top-3 flex h-9 min-w-9 items-center justify-center rounded-full bg-gold-400 px-2.5 text-sm font-bold text-brand-900 shadow-lg">
                          {q}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex gap-4 p-4 sm:gap-5 sm:p-5">
                      <div
                        className={cn(
                          "flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl",
                          "bg-gradient-to-br from-gold-400/25 via-brand-500/20 to-surface-3",
                          "ring-1 ring-gold-400/20"
                        )}
                      >
                        <UtensilsCrossed
                          className="h-9 w-9 text-gold-400/90"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Badge
                          variant="default"
                          className="mb-1.5 text-[10px] font-medium"
                        >
                          {item.category}
                        </Badge>
                        <h2 className="text-lg font-bold leading-snug text-text-primary sm:text-xl">
                          {item.name}
                        </h2>
                        {item.description ? (
                          <div className="mt-3">
                            <MenuItemDescription text={item.description} />
                          </div>
                        ) : null}
                        <p className="mt-3 text-xl font-bold tabular-nums text-gold-400">
                          {formatBRL(item.price)}
                        </p>
                      </div>
                    </div>
                  )}

                  {hasImg ? (
                    <div className="flex flex-1 flex-col gap-3 px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
                      <h2 className="text-lg font-bold leading-snug text-text-primary sm:text-xl">
                        {item.name}
                      </h2>
                      {item.description ? (
                        <MenuItemDescription text={item.description} />
                      ) : null}
                    </div>
                  ) : null}

                  <div
                    className={cn(
                      "mt-auto flex items-center justify-between gap-3 border-t border-border/80 px-4 py-4 sm:px-5",
                      hasImg ? "bg-surface-3/40" : "bg-surface-3/30"
                    )}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-text-muted sm:text-sm">
                      Quantidade
                    </span>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-12 w-12 touch-manipulation rounded-xl border-border sm:h-11 sm:w-11"
                        onClick={() => subOne(item.id)}
                        disabled={q === 0}
                        aria-label="Menos"
                      >
                        <Minus size={22} />
                      </Button>
                      <span className="min-w-[2.25rem] text-center text-xl font-bold tabular-nums text-text-primary">
                        {q}
                      </span>
                      <Button
                        type="button"
                        variant="primary"
                        size="icon"
                        className="h-12 w-12 touch-manipulation rounded-xl shadow-md shadow-gold-400/20 sm:h-11 sm:w-11"
                        onClick={() => addOne(item.id)}
                        disabled={q >= 20}
                        aria-label="Mais"
                      >
                        <Plus size={22} />
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/80 bg-surface/85 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto max-w-5xl">
          <Button
            variant="primary"
            className="h-14 w-full touch-manipulation rounded-2xl text-base font-bold shadow-lg shadow-gold-400/15 sm:h-[3.75rem] sm:text-lg"
            onClick={() => setCartOpen(true)}
            disabled={loading}
          >
            <ShoppingBag className="mr-2 h-6 w-6" />
            Ver pedido
            {cartCount > 0 ? (
              <Badge variant="warning" className="ml-2 text-sm">
                {cartCount}
              </Badge>
            ) : null}
            {cartTotal > 0 ? (
              <span className="ml-2 font-semibold opacity-95">
                · {formatBRL(cartTotal)}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Seu pedido">
        <div className="flex max-h-[min(75vh,520px)] flex-col gap-4 overflow-y-auto pr-1">
          {cartLines.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum item ainda.</p>
          ) : (
            <ul className="space-y-3">
              {cartLines.map(({ item, qty }) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface-3/80 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5 h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized={imgUnoptimized(item.image_url)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gold-400/50">
                          <UtensilsCrossed size={22} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight text-text-primary">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {formatBRL(item.price)} × {qty} ={" "}
                        <span className="font-medium text-gold-400">
                          {formatBRL(item.price * qty)}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => subOne(item.id)}
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="w-6 text-center text-sm font-bold">{qty}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => addOne(item.id)}
                      >
                        <Plus size={16} />
                      </Button>
                    </div>
                  </div>
                  {item.description ? (
                    <div className="mt-2.5 pl-[calc(3.5rem+0.75rem)] sm:pl-[4.25rem]">
                      <MenuItemDescription
                        variant="compact"
                        text={item.description}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <Input
            id="mesa-note"
            label="Observações (opcional)"
            placeholder="Ex: sem gelo, ponto da carne..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex items-center justify-between border-t border-border pt-3 text-lg font-bold">
            <span>Total</span>
            <span className="text-gold-400">{formatBRL(cartTotal)}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1 rounded-xl"
              onClick={() => setCartOpen(false)}
            >
              <X size={16} className="mr-1" /> Fechar
            </Button>
            <Button
              variant="primary"
              className="flex-1 rounded-xl"
              disabled={sending || cartLines.length === 0}
              onClick={() => void submitOrder()}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send size={16} className="mr-2" />
              )}
              Enviar ao garçom
            </Button>
          </div>
          <p className="text-center text-[11px] text-text-muted">
            O pedido aparece na área da equipe em tempo real.
          </p>
        </div>
      </Modal>
    </div>
  );
}

export default function MesaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-surface">
          <Loader2 className="h-10 w-10 animate-spin text-gold-400" />
        </div>
      }
    >
      <MesaContent />
    </Suspense>
  );
}
