import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const in7Days = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [
    boardsRes,
    openCardsRes,
    completedCardsRes,
    dueSoonRes,
    stockRes,
    documentsRes,
    incomeRes,
    expensesRes,
    teamRes,
    activityRes,
  ] = await Promise.all([
    supabase.from("trello_boards").select("id", { count: "exact", head: true }),
    supabase
      .from("trello_cards")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", false),
    supabase
      .from("trello_cards")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", true),
    supabase
      .from("trello_cards")
      .select("id, title, due_date")
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lte("due_date", in7Days)
      .gte("due_date", now.toISOString())
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("stock_items").select("current_qty, min_qty"),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "attention", "expired"]),
    supabase
      .from("finance_entries")
      .select("amount")
      .eq("type", "income")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    supabase
      .from("finance_entries")
      .select("amount")
      .eq("type", "expense")
      .gte("date", startOfMonth)
      .lte("date", endOfMonth),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("trello_card_comments")
      .select(
        "id, body, created_at, card_id, trello_cards(title), profiles(full_name)"
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalIncome = (incomeRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const totalExpenses = (expensesRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const stockAlertCount = (stockRes.data ?? []).filter(
    (i) => Number(i.current_qty) <= Number(i.min_qty)
  ).length;

  const dueSoonCards = (dueSoonRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    due_date: c.due_date,
  }));

  const recentActivity = (activityRes.data ?? []).map(
    (c: Record<string, unknown>) => {
      const cards = c.trello_cards as Record<string, string> | null;
      const profiles = c.profiles as Record<string, string> | null;
      return {
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        card_title: cards?.title ?? null,
        user_name: profiles?.full_name ?? null,
      };
    }
  );

  return NextResponse.json({
    boards: boardsRes.count ?? 0,
    open_cards: openCardsRes.count ?? 0,
    completed_cards: completedCardsRes.count ?? 0,
    due_soon: {
      count: dueSoonCards.length,
      cards: dueSoonCards,
    },
    stock_alerts: stockAlertCount,
    document_alerts: documentsRes.count ?? 0,
    finance: {
      income: totalIncome,
      expenses: totalExpenses,
      balance: totalIncome - totalExpenses,
    },
    team: teamRes.count ?? 0,
    recent_activity: recentActivity,
  });
}
