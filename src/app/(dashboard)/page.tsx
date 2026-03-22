"use client";

import { useState, useEffect } from "react";
import {
  Columns3,
  ListTodo,
  CheckCircle,
  Users,
  Calendar,
  AlertTriangle,
  FileWarning,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MessageSquare,
  ArrowRight,
  Loader2,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

interface DueSoonCard {
  id: string;
  title: string;
  due_date: string;
}

interface ActivityItem {
  id: string;
  body: string;
  created_at: string;
  card_title: string | null;
  user_name: string | null;
}

interface DashboardData {
  boards: number;
  open_cards: number;
  completed_cards: number;
  due_soon: {
    count: number;
    cards: DueSoonCard[];
  };
  stock_alerts: number;
  document_alerts: number;
  finance: {
    income: number;
    expenses: number;
    balance: number;
  };
  team: number;
  recent_activity: ActivityItem[];
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  loading: boolean;
}) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className={cn("rounded-xl p-3", iconColor)}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-surface-3" />
          ) : (
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          )}
          <p className="text-sm text-text-secondary">{title}</p>
        </div>
      </div>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <div className="space-y-3">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-3" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-3" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-3" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-3" />
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Erro ao carregar dashboard");
        const json = await res.json();
        setData(json);
      } catch {
        setError(true);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function getDueBadgeVariant(dueDate: string) {
    const diff = new Date(dueDate).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 1) return "danger" as const;
    if (days <= 3) return "warning" as const;
    return "info" as const;
  }

  function getDueBadgeLabel(dueDate: string) {
    const diff = new Date(dueDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return "Hoje";
    if (days === 1) return "Amanhã";
    return `${days} dias`;
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral do Bendita Bar"
      />

      {error && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <AlertTriangle size={48} className="mb-4 text-yellow-500" />
          <p className="text-lg font-medium">Erro ao carregar dados</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-gold-400 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Row 1 — Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Quadros ativos"
              value={data?.boards ?? 0}
              icon={Columns3}
              iconColor="bg-brand-500"
              loading={loading}
            />
            <StatCard
              title="Tarefas abertas"
              value={data?.open_cards ?? 0}
              icon={ListTodo}
              iconColor="bg-yellow-500"
              loading={loading}
            />
            <StatCard
              title="Tarefas concluídas"
              value={data?.completed_cards ?? 0}
              icon={CheckCircle}
              iconColor="bg-green-500"
              loading={loading}
            />
            <StatCard
              title="Equipe"
              value={data?.team ?? 0}
              icon={Users}
              iconColor="bg-blue-500"
              loading={loading}
            />
          </div>

          {/* Row 2 — Due soon + Alerts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Calendar
                        size={18}
                        className="mr-2 inline text-brand-500"
                      />
                      Vencendo em breve
                    </CardTitle>
                    {data && data.due_soon.count > 0 && (
                      <Badge variant="warning">{data.due_soon.count}</Badge>
                    )}
                  </CardHeader>
                  {data && data.due_soon.cards.length > 0 ? (
                    <div className="space-y-2">
                      {data.due_soon.cards.map((card) => (
                        <div
                          key={card.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface-3 px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1 mr-3">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {card.title}
                            </p>
                            <p className="text-xs text-text-muted">
                              {format(
                                new Date(card.due_date),
                                "dd 'de' MMM, HH:mm",
                                { locale: ptBR }
                              )}
                            </p>
                          </div>
                          <Badge variant={getDueBadgeVariant(card.due_date)}>
                            {getDueBadgeLabel(card.due_date)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-text-muted">
                      Nenhuma tarefa vencendo em breve
                    </p>
                  )}
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <AlertTriangle
                        size={18}
                        className="mr-2 inline text-yellow-500"
                      />
                      Alertas
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    <a
                      href="/estoque"
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-3 px-4 py-3 transition-colors hover:border-gold-400/50 hover:bg-surface-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-500/15 p-2">
                          <Package size={18} className="text-red-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            Estoque baixo
                          </p>
                          <p className="text-xs text-text-muted">
                            Itens abaixo do mínimo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(data?.stock_alerts ?? 0) > 0 ? (
                          <Badge variant="danger">
                            {data?.stock_alerts}
                          </Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                        <ArrowRight
                          size={16}
                          className="text-text-muted"
                        />
                      </div>
                    </a>

                    <a
                      href="/documentos"
                      className="flex items-center justify-between rounded-lg border border-border bg-surface-3 px-4 py-3 transition-colors hover:border-gold-400/50 hover:bg-surface-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-yellow-500/15 p-2">
                          <FileWarning
                            size={18}
                            className="text-yellow-400"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            Documentos pendentes
                          </p>
                          <p className="text-xs text-text-muted">
                            Precisam de atenção
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(data?.document_alerts ?? 0) > 0 ? (
                          <Badge variant="warning">
                            {data?.document_alerts}
                          </Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                        <ArrowRight
                          size={16}
                          className="text-text-muted"
                        />
                      </div>
                    </a>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Row 3 — Finance + Activity */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <DollarSign
                        size={18}
                        className="mr-2 inline text-green-400"
                      />
                      Financeiro do mês
                    </CardTitle>
                  </CardHeader>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TrendingUp size={18} className="text-green-400" />
                        <span className="text-sm text-text-secondary">
                          Receitas
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-green-400">
                        {formatBRL(data?.finance.income ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-3 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <TrendingDown size={18} className="text-red-400" />
                        <span className="text-sm text-text-secondary">
                          Despesas
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-red-400">
                        {formatBRL(data?.finance.expenses ?? 0)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-medium text-text-primary">
                          Saldo
                        </span>
                        <span
                          className={cn(
                            "text-lg font-bold",
                            (data?.finance.balance ?? 0) >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          )}
                        >
                          {formatBRL(data?.finance.balance ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>
                      <MessageSquare
                        size={18}
                        className="mr-2 inline text-blue-400"
                      />
                      Atividade recente
                    </CardTitle>
                  </CardHeader>
                  {data && data.recent_activity.length > 0 ? (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {data.recent_activity.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border bg-surface-3 px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-gold-400 truncate">
                              {item.user_name ?? "Usuário"}
                            </span>
                            <span className="shrink-0 text-[10px] text-text-muted">
                              {formatDistanceToNow(
                                new Date(item.created_at),
                                { addSuffix: true, locale: ptBR }
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-text-primary line-clamp-2">
                            {item.body}
                          </p>
                          {item.card_title && (
                            <p className="mt-1 truncate text-xs text-text-muted">
                              em {item.card_title}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-text-muted">
                      Nenhuma atividade recente
                    </p>
                  )}
                </Card>
              </>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface/50 backdrop-blur-sm pointer-events-none">
          <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
        </div>
      )}
    </div>
  );
}
