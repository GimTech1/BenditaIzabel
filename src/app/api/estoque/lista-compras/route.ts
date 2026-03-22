import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const lineSelect = `
  *,
  stock_items (
    id,
    name,
    unit,
    current_qty
  )
`;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("purchase_list_lines")
      .select(lineSelect)
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

/** Linha existente no estoque: merge por stock_item_id. Item novo: INSERT (sem merge). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const stock_item_id = body.stock_item_id as string | undefined | null;
    const quantity = Number(body.quantity);
    const note = trimStr(body.note);

    if (!Number.isFinite(quantity) || quantity <= 0)
      return NextResponse.json(
        { error: "quantity deve ser maior que zero" },
        { status: 400 }
      );

    const isNewItem =
      !stock_item_id ||
      (typeof stock_item_id === "string" && stock_item_id.trim() === "");

    if (!isNewItem) {
      const sid = String(stock_item_id).trim();
      const { data: existing, error: selErr } = await supabase
        .from("purchase_list_lines")
        .select("id, quantity")
        .eq("stock_item_id", sid)
        .maybeSingle();

      if (selErr)
        return NextResponse.json({ error: selErr.message }, { status: 400 });

      if (existing) {
        const newQty = Number(existing.quantity) + quantity;
        const { data, error } = await supabase
          .from("purchase_list_lines")
          .update({
            quantity: newQty,
            ...(note !== null ? { note } : {}),
          })
          .eq("id", existing.id)
          .select(lineSelect)
          .single();

        if (error)
          return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 200 });
      }

      const { data, error } = await supabase
        .from("purchase_list_lines")
        .insert({
          stock_item_id: sid,
          quantity,
          note,
        })
        .select(lineSelect)
        .single();

      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data, { status: 201 });
    }

    const name = trimStr(body.name);
    const category = trimStr(body.category);
    const unit = trimStr(body.unit);
    if (!name || !category || !unit)
      return NextResponse.json(
        {
          error:
            "Para item novo: name, category e unit são obrigatórios (igual ao cadastro de estoque).",
        },
        { status: 400 }
      );

    const min_qty = Number(body.min_qty);
    const minQtyVal =
      Number.isFinite(min_qty) && min_qty >= 0 ? min_qty : 0;
    const supplierRaw = body.supplier_id;
    const supplier_id =
      typeof supplierRaw === "string" && supplierRaw.trim()
        ? supplierRaw.trim()
        : null;
    const costRaw = body.cost_per_unit;
    let cost_per_unit: number | null = null;
    if (costRaw !== undefined && costRaw !== null && costRaw !== "") {
      const c = Number(costRaw);
      if (Number.isFinite(c) && c >= 0) cost_per_unit = c;
    }

    const { data, error } = await supabase
      .from("purchase_list_lines")
      .insert({
        stock_item_id: null,
        quantity,
        note,
        name,
        category,
        unit,
        min_qty: minQtyVal,
        supplier_id,
        cost_per_unit,
      })
      .select(lineSelect)
      .single();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
