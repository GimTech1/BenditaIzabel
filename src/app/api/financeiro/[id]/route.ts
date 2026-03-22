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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "gerente"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      date,
      type,
      category,
      description,
      amount,
      payment_method,
      status,
      supplier_id,
      notes,
      reference_code,
      invoice_file_url,
    } = body;

    const update: Record<string, unknown> = {};
    if (date !== undefined) update.date = date;
    if (type !== undefined) update.type = type;
    if (category !== undefined) update.category = category;
    if (description !== undefined) update.description = description;
    if (amount !== undefined) update.amount = amount;
    if (payment_method !== undefined) update.payment_method = payment_method;
    if (status !== undefined) update.status = status;
    if (supplier_id !== undefined) update.supplier_id = supplier_id || null;
    if (notes !== undefined) update.notes = notes || null;
    if (reference_code !== undefined) update.reference_code = reference_code || null;
    if (invoice_file_url !== undefined) update.invoice_file_url = invoice_file_url || null;

    const { data, error } = await supabase
      .from("finance_entries")
      .update(update)
      .eq("id", id)
      .select()
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || !["admin", "gerente"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("finance_entries")
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
