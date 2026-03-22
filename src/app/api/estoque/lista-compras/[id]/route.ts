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

function trimStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: row, error: fetchErr } = await supabase
      .from("purchase_list_lines")
      .select("stock_item_id")
      .eq("id", id)
      .single();

    if (fetchErr || !row)
      return NextResponse.json({ error: "Linha não encontrada" }, { status: 404 });

    const body = await request.json();
    const quantity =
      body.quantity !== undefined ? Number(body.quantity) : undefined;
    const note =
      body.note === undefined
        ? undefined
        : typeof body.note === "string" && body.note.trim()
          ? body.note.trim()
          : null;

    const update: Record<string, unknown> = {};
    if (quantity !== undefined) {
      if (!Number.isFinite(quantity) || quantity <= 0)
        return NextResponse.json(
          { error: "quantity deve ser maior que zero" },
          { status: 400 }
        );
      update.quantity = quantity;
    }
    if (note !== undefined) update.note = note;

    const isDraft = row.stock_item_id === null;

    if (isDraft) {
      if (body.name !== undefined) {
        const n = trimStr(body.name);
        if (!n)
          return NextResponse.json(
            { error: "name não pode ser vazio" },
            { status: 400 }
          );
        update.name = n;
      }
      if (body.category !== undefined) {
        const c = trimStr(body.category);
        if (!c)
          return NextResponse.json(
            { error: "category não pode ser vazio" },
            { status: 400 }
          );
        update.category = c;
      }
      if (body.unit !== undefined) {
        const u = trimStr(body.unit);
        if (!u)
          return NextResponse.json(
            { error: "unit não pode ser vazio" },
            { status: 400 }
          );
        update.unit = u;
      }
      if (body.min_qty !== undefined) {
        const m = Number(body.min_qty);
        if (!Number.isFinite(m) || m < 0)
          return NextResponse.json(
            { error: "min_qty inválido" },
            { status: 400 }
          );
        update.min_qty = m;
      }
      if (body.supplier_id !== undefined) {
        const s = body.supplier_id;
        update.supplier_id =
          typeof s === "string" && s.trim() ? s.trim() : null;
      }
      if (body.cost_per_unit !== undefined) {
        const c = body.cost_per_unit;
        if (c === null || c === "")
          update.cost_per_unit = null;
        else {
          const n = Number(c);
          if (!Number.isFinite(n) || n < 0)
            return NextResponse.json(
              { error: "cost_per_unit inválido" },
              { status: 400 }
            );
          update.cost_per_unit = n;
        }
      }
    }

    if (Object.keys(update).length === 0)
      return NextResponse.json(
        { error: "Nada para atualizar" },
        { status: 400 }
      );

    const { data, error } = await supabase
      .from("purchase_list_lines")
      .update(update)
      .eq("id", id)
      .select(lineSelect)
      .single();

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("purchase_list_lines")
      .delete()
      .eq("id", id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
