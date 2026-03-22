import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Itens já no estoque: soma qty. Itens novos: cria stock_items com current_qty = qty comprada. */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "gerente"].includes(profile.role)) {
      return NextResponse.json(
        {
          error:
            "Apenas administrador ou gerente pode registrar a compra no estoque.",
        },
        { status: 403 }
      );
    }

    const { data: lines, error: linesErr } = await supabase
      .from("purchase_list_lines")
      .select(
        "id, stock_item_id, quantity, name, category, unit, min_qty, supplier_id, cost_per_unit"
      );

    if (linesErr)
      return NextResponse.json({ error: linesErr.message }, { status: 400 });

    if (!lines?.length) {
      return NextResponse.json({
        success: true,
        message: "Lista de compras já está vazia.",
        updated: 0,
      });
    }

    for (const line of lines) {
      const addQty = Number(line.quantity);
      if (!Number.isFinite(addQty) || addQty <= 0) continue;

      if (line.stock_item_id) {
        const { data: item, error: getErr } = await supabase
          .from("stock_items")
          .select("current_qty")
          .eq("id", line.stock_item_id)
          .single();

        if (getErr || !item) {
          return NextResponse.json(
            { error: `Item de estoque não encontrado: ${line.stock_item_id}` },
            { status: 400 }
          );
        }

        const newQty = Number(item.current_qty) + addQty;
        const { error: upErr } = await supabase
          .from("stock_items")
          .update({ current_qty: newQty })
          .eq("id", line.stock_item_id);

        if (upErr)
          return NextResponse.json({ error: upErr.message }, { status: 400 });
      } else {
        const name = line.name?.trim();
        const category = line.category?.trim();
        const unit = line.unit?.trim();
        if (!name || !category || !unit) {
          return NextResponse.json(
            {
              error:
                "Linha de item novo inválida (faltam nome, categoria ou unidade).",
            },
            { status: 400 }
          );
        }

        const minQ = Number(line.min_qty);
        const min_qty =
          Number.isFinite(minQ) && minQ >= 0 ? minQ : 0;

        const { error: insErr } = await supabase.from("stock_items").insert({
          name,
          category,
          unit,
          current_qty: addQty,
          min_qty,
          supplier_id: line.supplier_id || null,
          cost_per_unit:
            line.cost_per_unit != null && Number.isFinite(Number(line.cost_per_unit))
              ? Number(line.cost_per_unit)
              : null,
        });

        if (insErr)
          return NextResponse.json({ error: insErr.message }, { status: 400 });
      }
    }

    const ids = lines.map((l) => l.id);
    const { error: delErr } = await supabase
      .from("purchase_list_lines")
      .delete()
      .in("id", ids);

    if (delErr)
      return NextResponse.json({ error: delErr.message }, { status: 400 });

    return NextResponse.json({
      success: true,
      message: "Compra registrada e estoque atualizado.",
      updated: lines.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
