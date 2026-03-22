import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const body = await request.json();
    const { name, category, unit, current_qty, min_qty, supplier_id, cost_per_unit } = body;

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (category !== undefined) update.category = category;
    if (unit !== undefined) update.unit = unit;
    if (current_qty !== undefined) update.current_qty = current_qty;
    if (min_qty !== undefined) update.min_qty = min_qty;
    if (supplier_id !== undefined) update.supplier_id = supplier_id || null;
    if (cost_per_unit !== undefined) update.cost_per_unit = cost_per_unit || null;

    const { data, error } = await supabase
      .from("stock_items")
      .update(update)
      .eq("id", id)
      .select("*, suppliers(name)")
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
      .from("stock_items")
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
