"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Loader2,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Bell,
  RefreshCw,
  CheckCircle2,
  ChefHat,
  Ban,
  Upload,
  ImageOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/client";
import {
  OFFICIAL_MENU_LABEL,
  OFFICIAL_MENU_PDF_PATH,
} from "@/lib/cardapio-official";
import {
  MENU_ITEM_IMAGE_BUCKET,
  MENU_ITEM_IMAGE_MAX_BYTES,
  isAllowedMenuItemImage,
  menuItemImageExtension,
} from "@/lib/menu-item-image";
import { canManageMenuItems } from "@/lib/cardapio-access";
import { cn } from "@/lib/utils";
import type {
  MenuItem,
  MenuOrder,
  MenuOrderLine,
  MenuOrderStatus,
} from "@/lib/types";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function statusLabel(s: MenuOrderStatus) {
  switch (s) {
    case "novo":
      return "Novo";
    case "em_preparo":
      return "Em preparo";
    case "entregue":
      return "Entregue";
    case "cancelado":
      return "Cancelado";
    default:
      return s;
  }
}

function statusVariant(
  s: MenuOrderStatus
): "success" | "warning" | "danger" | "default" {
  if (s === "novo") return "warning";
  if (s === "em_preparo") return "default";
  if (s === "entregue") return "success";
  return "danger";
}

function parseOrderItems(raw: unknown): MenuOrderLine[] {
  if (!Array.isArray(raw)) return [];
  return raw as MenuOrderLine[];
}

export default function CardapioPage() {
  const [tab, setTab] = useState<"pedidos" | "itens">("pedidos");
  const [orders, setOrders] = useState<MenuOrder[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [canManageMenu, setCanManageMenu] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("geral");
  const [formPrice, setFormPrice] = useState("");
  const [formAvailable, setFormAvailable] = useState(true);
  const [formSort, setFormSort] = useState("0");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [pendingMenuImage, setPendingMenuImage] = useState<File | null>(null);
  const [removeMenuImage, setRemoveMenuImage] = useState(false);
  const menuImageInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingMenuImage) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingMenuImage);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingMenuImage]);

  function resetItemImageFields() {
    setFormImageUrl("");
    setPendingMenuImage(null);
    setRemoveMenuImage(false);
    if (menuImageInputRef.current) menuImageInputRef.current.value = "";
  }

  function closeItemModal() {
    setShowItemModal(false);
    resetItemImageFields();
  }

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const data = await api<MenuOrder[]>("/api/cardapio/orders?limit=100");
      setOrders(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar pedidos");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    try {
      const data = await api<MenuItem[]>("/api/cardapio/menu");
      setMenuItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar cardápio");
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setCanManageMenu(canManageMenuItems(profile?.role as string | undefined));
    })();
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchMenu();
  }, [fetchOrders, fetchMenu]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("menu_orders_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "menu_orders" },
        (payload) => {
          const row = payload.new as { table_label?: string };
          toast.success(
            `Novo pedido — Mesa ${row?.table_label ?? "?"}`
          );
          fetchOrders();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const novosCount = useMemo(
    () => orders.filter((o) => o.status === "novo").length,
    [orders]
  );

  async function updateOrderStatus(id: string, status: MenuOrderStatus) {
    try {
      await api(`/api/cardapio/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success("Pedido atualizado");
      fetchOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  function openNewItem() {
    setEditingItem(null);
    setFormName("");
    setFormDesc("");
    setFormCategory("geral");
    setFormPrice("");
    setFormAvailable(true);
    setFormSort("0");
    resetItemImageFields();
    setShowItemModal(true);
  }

  function openEditItem(item: MenuItem) {
    setEditingItem(item);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormCategory(item.category);
    setFormPrice(String(item.price));
    setFormAvailable(item.is_available);
    setFormSort(String(item.sort_order));
    setPendingMenuImage(null);
    setRemoveMenuImage(false);
    setFormImageUrl(item.image_url ?? "");
    if (menuImageInputRef.current) menuImageInputRef.current.value = "";
    setShowItemModal(true);
  }

  async function saveItem() {
    const price = parseFloat(formPrice.replace(",", "."));
    if (!formName.trim() || isNaN(price) || price < 0) {
      toast.error("Nome e preço válidos são obrigatórios");
      return;
    }
    setSavingItem(true);
    try {
      let image_url: string | null;
      if (removeMenuImage) {
        image_url = null;
      } else if (pendingMenuImage) {
        if (!isAllowedMenuItemImage(pendingMenuImage)) {
          toast.error("Use JPG, PNG, WebP ou GIF até 5 MB");
          setSavingItem(false);
          return;
        }
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Sessão expirada");
          setSavingItem(false);
          return;
        }
        const ext = menuItemImageExtension(pendingMenuImage.type);
        const path = `items/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(MENU_ITEM_IMAGE_BUCKET)
          .upload(path, pendingMenuImage, {
            cacheControl: "3600",
            upsert: false,
            contentType: pendingMenuImage.type || undefined,
          });
        if (upErr) {
          toast.error(upErr.message || "Erro ao enviar imagem");
          setSavingItem(false);
          return;
        }
        const { data: pub } = supabase.storage
          .from(MENU_ITEM_IMAGE_BUCKET)
          .getPublicUrl(path);
        image_url = pub.publicUrl;
      } else if (formImageUrl.trim()) {
        image_url = formImageUrl.trim();
      } else if (editingItem?.image_url) {
        image_url = editingItem.image_url;
      } else {
        image_url = null;
      }

      const body = {
        name: formName.trim(),
        description: formDesc.trim() || null,
        category: formCategory.trim() || "geral",
        price,
        is_available: formAvailable,
        sort_order: parseInt(formSort, 10) || 0,
        image_url,
      };
      if (editingItem) {
        await api(`/api/cardapio/menu/${editingItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Item atualizado");
      } else {
        await api("/api/cardapio/menu", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Item criado");
      }
      closeItemModal();
      fetchMenu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingItem(false);
    }
  }

  async function deleteItem(item: MenuItem) {
    if (!confirm(`Excluir "${item.name}" do cardápio?`)) return;
    try {
      await api(`/api/cardapio/menu/${item.id}`, { method: "DELETE" });
      toast.success("Item removido");
      fetchMenu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  async function toggleItemAvailable(item: MenuItem) {
    try {
      await api(`/api/cardapio/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_available: !item.is_available }),
      });
      toast.success(
        item.is_available
          ? "Item oculto do cardápio do cliente"
          : "Item visível no cardápio do cliente"
      );
      fetchMenu();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  const mesaUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/mesa`
      : "/mesa";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cardápio"
        description="Pedidos das mesas em tempo real e itens do cardápio digital."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mesa"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border",
                "bg-surface-3 px-3 text-sm font-medium text-text-primary hover:bg-surface-4"
              )}
            >
              <ExternalLink size={16} />
              Abrir tela do cliente
            </Link>
            <Link
              href={OFFICIAL_MENU_PDF_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-gold-400/35",
                "bg-gold-400/10 px-3 text-sm font-medium text-gold-400 hover:bg-gold-400/15"
              )}
            >
              <ExternalLink size={16} />
              {OFFICIAL_MENU_LABEL}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(mesaUrl);
                toast.success("Link copiado — use no tablet da mesa");
              }}
            >
              Copiar link /mesa
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setTab("pedidos")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none",
            tab === "pedidos"
              ? "bg-gold-400/15 text-gold-400"
              : "text-text-secondary hover:bg-surface-3"
          )}
        >
          <Bell size={18} />
          Pedidos garçom
          {novosCount > 0 ? (
            <Badge variant="warning" className="ml-1">
              {novosCount}
            </Badge>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab("itens")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:flex-none",
            tab === "itens"
              ? "bg-gold-400/15 text-gold-400"
              : "text-text-secondary hover:bg-surface-3"
          )}
        >
          <UtensilsCrossed size={18} />
          Itens do cardápio
        </button>
      </div>

      <Card className="border-dashed border-gold-400/30 bg-gold-400/5 p-4">
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">Tablet na mesa:</strong> abra{" "}
          <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
            /mesa?mesa=12
          </code>{" "}
          (troque o número) ou peça ao cliente informar a mesa na tela. Os
          pedidos aparecem aqui com notificação em tempo real.
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          O PDF oficial ({OFFICIAL_MENU_LABEL}) está em{" "}
          <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs">
            public/branding/cardapio-giggs-2026.pdf
          </code>
          . Cadastre os itens na aba <strong>Itens do cardápio</strong> para o
          cliente pedir pelo app (o PDF não é lido automaticamente — é imagem).
        </p>
      </Card>

      {tab === "pedidos" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-text-primary">
              Fila de pedidos
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchOrders()}
              disabled={loadingOrders}
            >
              <RefreshCw
                size={16}
                className={cn("mr-1", loadingOrders && "animate-spin")}
              />
              Atualizar
            </Button>
          </div>

          {loadingOrders && orders.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-text-muted">
              Nenhum pedido ainda. Quando um cliente enviar pelo cardápio, aparece
              aqui.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => {
                const lines = parseOrderItems(order.items);
                return (
                  <li
                    key={order.id}
                    className={cn(
                      "rounded-xl border border-border bg-surface-2 p-4",
                      order.status === "novo" && "ring-1 ring-gold-400/40"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold text-gold-400">
                          Mesa {order.table_label}
                        </p>
                        <p className="text-xs text-text-muted">
                          {format(
                            new Date(order.created_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-text-secondary">
                      {lines.map((l, i) => (
                        <li key={i}>
                          {l.quantity}× {l.name} — {formatBRL(l.line_total)}
                        </li>
                      ))}
                    </ul>
                    {order.customer_note ? (
                      <p className="mt-2 rounded-lg bg-surface-3 px-3 py-2 text-sm text-text-primary">
                        <span className="text-text-muted">Obs.: </span>
                        {order.customer_note}
                      </p>
                    ) : null}
                    <p className="mt-2 text-right text-lg font-semibold text-text-primary">
                      Total {formatBRL(order.total)}
                    </p>
                    {order.status !== "entregue" &&
                    order.status !== "cancelado" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {order.status === "novo" ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() =>
                              updateOrderStatus(order.id, "em_preparo")
                            }
                          >
                            <ChefHat size={14} className="mr-1" />
                            Aceitar / preparo
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            updateOrderStatus(order.id, "entregue")
                          }
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Marcar entregue
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() =>
                            updateOrderStatus(order.id, "cancelado")
                          }
                        >
                          <Ban size={14} className="mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="border-gold-400/25 bg-gradient-to-br from-gold-400/10 via-surface-2 to-surface-2 p-4">
            <h3 className="text-sm font-semibold text-gold-400">
              Gestão manual do cardápio
            </h3>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-text-secondary">
              <li>
                <strong className="text-text-primary">Cadastrar:</strong> botão{" "}
                <em>Novo item</em> — nome, categoria, preço, foto opcional.
              </li>
              <li>
                <strong className="text-text-primary">Editar:</strong> ícone de
                lápis na linha do item.
              </li>
              <li>
                <strong className="text-text-primary">Ativar / desativar:</strong>{" "}
                interruptor na coluna <em>No tablet</em> (desligado = cliente não
                vê).
              </li>
              <li>
                <strong className="text-text-primary">Remover:</strong> ícone da
                lixeira (exclusão definitiva).
              </li>
            </ul>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-text-primary">
              Itens exibidos no tablet
            </h2>
            <div className="flex gap-2">
              {canManageMenu ? (
                <Button variant="primary" size="sm" onClick={openNewItem}>
                  <Plus size={16} className="mr-1" />
                  Novo item manual
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchMenu()}
                disabled={loadingMenu}
              >
                <RefreshCw
                  size={16}
                  className={cn(loadingMenu && "animate-spin")}
                />
              </Button>
            </div>
          </div>

          {!canManageMenu ? (
            <p className="text-sm text-text-muted">
              Faça login com perfil da equipe (admin, gerente ou funcionário) para
              gerenciar o cardápio.
            </p>
          ) : null}

          {loadingMenu && menuItems.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-text-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-3 text-left text-text-secondary">
                    <th className="w-14 px-2 py-2 font-medium">Foto</th>
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium text-right">Preço</th>
                    <th className="px-3 py-2 font-medium whitespace-nowrap">
                      No tablet
                    </th>
                    <th className="w-28 px-3 py-2 text-right font-medium">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-2 py-2">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt=""
                            className="h-11 w-11 rounded-lg border border-border object-cover"
                          />
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-text-muted">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <p className="font-medium text-text-primary">
                          {item.name}
                        </p>
                        {item.description ? (
                          <p className="text-xs text-text-muted line-clamp-2">
                            {item.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-text-secondary">
                        {item.category}
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatBRL(item.price)}
                      </td>
                      <td className="px-3 py-2">
                        {canManageMenu ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.is_available}
                            title={
                              item.is_available
                                ? "Visível no /mesa — clique para ocultar"
                                : "Oculto — clique para exibir"
                            }
                            onClick={() => void toggleItemAvailable(item)}
                            className={cn(
                              "relative inline-flex h-8 w-[3.25rem] shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50",
                              item.is_available
                                ? "border-emerald-500/50 bg-emerald-600/40"
                                : "border-border bg-surface-4"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform",
                                item.is_available
                                  ? "translate-x-[1.35rem]"
                                  : "translate-x-1"
                              )}
                            />
                          </button>
                        ) : item.is_available ? (
                          <Badge variant="success">Sim</Badge>
                        ) : (
                          <Badge variant="default">Não</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {canManageMenu ? (
                          <div className="flex justify-end gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar item"
                              onClick={() => openEditItem(item)}
                            >
                              <Edit3 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Excluir item"
                              onClick={() => void deleteItem(item)}
                            >
                              <Trash2 size={14} className="text-red-400" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        open={showItemModal}
        onClose={closeItemModal}
        title={
          editingItem ? "Editar item" : "Cadastrar item manualmente"
        }
      >
        <div className="flex max-h-[min(80vh,560px)] flex-col gap-4 overflow-y-auto pr-1">
          <Input
            id="mi-name"
            label="Nome"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <Textarea
            id="mi-desc"
            label="Descrição (vista pelo cliente na mesa)"
            placeholder="Ex: Vodka, suco de laranja e grenadine · servido com gelo e limão…"
            rows={5}
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
          <p className="-mt-1 text-[11px] text-text-muted">
            Aparece no cardápio digital no bloco dourado <strong>Sobre este item</strong>. Textos
            longos ganham &quot;Ler mais&quot; no tablet.
          </p>
          <Input
            id="mi-cat"
            label="Categoria"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
          />
          <Input
            id="mi-price"
            label="Preço (R$)"
            type="number"
            step="0.01"
            min={0}
            value={formPrice}
            onChange={(e) => setFormPrice(e.target.value)}
          />

          <div className="space-y-2 rounded-lg border border-border bg-surface-3/50 p-3">
            <label className="text-sm font-medium text-text-secondary">
              Foto do item (opcional)
            </label>
            <input
              ref={menuImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setPendingMenuImage(f);
                  setRemoveMenuImage(false);
                }
              }}
            />
            {(() => {
              const src = removeMenuImage
                ? null
                : previewUrl ||
                  formImageUrl.trim() ||
                  editingItem?.image_url ||
                  null;
              return src ? (
                <div className="relative mx-auto max-h-40 w-full max-w-xs overflow-hidden rounded-lg border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className="max-h-40 w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-xs text-text-muted">
                  Nenhuma imagem
                </div>
              );
            })()}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => menuImageInputRef.current?.click()}
              >
                <Upload size={14} className="mr-1" />
                {pendingMenuImage ? "Trocar foto" : "Enviar foto"}
              </Button>
              {(previewUrl ||
                formImageUrl.trim() ||
                editingItem?.image_url) &&
              !removeMenuImage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-400"
                  onClick={() => {
                    setRemoveMenuImage(true);
                    setPendingMenuImage(null);
                    setFormImageUrl("");
                    if (menuImageInputRef.current)
                      menuImageInputRef.current.value = "";
                  }}
                >
                  <ImageOff size={14} className="mr-1" />
                  Remover
                </Button>
              ) : null}
              {removeMenuImage ? (
                <button
                  type="button"
                  className="text-xs text-gold-400 underline"
                  onClick={() => {
                    setRemoveMenuImage(false);
                    setFormImageUrl(editingItem?.image_url ?? "");
                  }}
                >
                  Desfazer remoção
                </button>
              ) : null}
            </div>
            <Input
              id="mi-img-url"
              label="Ou cole URL da imagem"
              placeholder="https://..."
              value={formImageUrl}
              onChange={(e) => {
                setFormImageUrl(e.target.value);
                if (e.target.value.trim()) {
                  setPendingMenuImage(null);
                  if (menuImageInputRef.current)
                    menuImageInputRef.current.value = "";
                  setRemoveMenuImage(false);
                }
              }}
            />
            <p className="text-[11px] text-text-muted">
              JPG, PNG, WebP ou GIF · máx.{" "}
              {Math.round(MENU_ITEM_IMAGE_MAX_BYTES / 1024 / 1024)} MB · bucket{" "}
              <code className="rounded bg-surface-2 px-1">{MENU_ITEM_IMAGE_BUCKET}</code>{" "}
              (migration 13)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="mi-avail"
              type="checkbox"
              checked={formAvailable}
              onChange={(e) => setFormAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="mi-avail" className="text-sm text-text-secondary">
              Disponível no cardápio do cliente
            </label>
          </div>
          <Input
            id="mi-sort"
            label="Ordem (menor aparece primeiro)"
            type="number"
            value={formSort}
            onChange={(e) => setFormSort(e.target.value)}
          />
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={closeItemModal}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              disabled={savingItem}
              onClick={() => void saveItem()}
            >
              {savingItem ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
