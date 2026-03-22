import { createClient } from "@/lib/supabase/server";
import { createAnonOnlyClient } from "@/lib/supabase/anon-only";
import { NextRequest, NextResponse } from "next/server";
import type { MenuOrderLine } from "@/lib/types";

const MAX_LINES = 30;
const MAX_QTY = 20;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const status = request.nextUrl.searchParams.get("status");
    const limit = Math.min(
      100,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 80)
    );

    let q = supabase
      .from("menu_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (
      status &&
      ["novo", "em_preparo", "entregue", "cancelado"].includes(status)
    ) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const table_label_raw = body.table_label;
    const customer_note = body.customer_note;
    const lines = body.lines as { menu_item_id: string; quantity: number }[];

    const table_label =
      typeof table_label_raw === "string"
        ? table_label_raw.trim().slice(0, 40)
        : "";
    if (!table_label) {
      return NextResponse.json(
        { error: "Informe o número ou nome da mesa" },
        { status: 400 }
      );
    }

    if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) {
      return NextResponse.json(
        { error: "Pedido inválido: adicione itens" },
        { status: 400 }
      );
    }

    const merged = new Map<string, number>();
    for (const line of lines) {
      if (!line?.menu_item_id || typeof line.quantity !== "number") {
        return NextResponse.json({ error: "Itens inválidos" }, { status: 400 });
      }
      const q = Math.floor(line.quantity);
      if (q < 1 || q > MAX_QTY) {
        return NextResponse.json(
          { error: `Quantidade entre 1 e ${MAX_QTY}` },
          { status: 400 }
        );
      }
      const prev = merged.get(line.menu_item_id) ?? 0;
      merged.set(line.menu_item_id, prev + q);
    }

    const ids = [...merged.keys()];
    const supabase = createAnonOnlyClient();
    const { data: items, error: fetchErr } = await supabase
      .from("menu_items")
      .select("id,name,price,is_available")
      .in("id", ids)
      .eq("is_available", true);

    if (fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 400 });
    if (!items || items.length !== ids.length) {
      return NextResponse.json(
        { error: "Algum item não está disponível ou foi removido" },
        { status: 400 }
      );
    }

    const byId = new Map(items.map((i) => [i.id, i]));
    const snapshot: MenuOrderLine[] = [];
    let total = 0;
    for (const [menu_item_id, quantity] of merged) {
      const item = byId.get(menu_item_id)!;
      const unit = Number(item.price);
      const line_total = Math.round(unit * quantity * 100) / 100;
      total += line_total;
      snapshot.push({
        menu_item_id,
        name: item.name,
        unit_price: unit,
        quantity,
        line_total,
      });
    }
    total = Math.round(total * 100) / 100;

    const note =
      customer_note != null && typeof customer_note === "string"
        ? customer_note.trim().slice(0, 500) || null
        : null;

    const { data: order, error: insErr } = await supabase
      .from("menu_orders")
      .insert({
        table_label,
        customer_note: note,
        status: "novo",
        items: snapshot,
        total,
      })
      .select()
      .single();

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    return NextResponse.json(order, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
