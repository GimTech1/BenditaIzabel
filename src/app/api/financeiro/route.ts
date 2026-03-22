import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const month = sp.get("month");
    const type = sp.get("type");
    const category = sp.get("category");
    const status = sp.get("status");
    const payment_method = sp.get("payment_method");
    const search = sp.get("q")?.trim();

    let query = supabase
      .from("finance_entries")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (month) {
      const start = `${month}-01`;
      const [year, m] = month.split("-").map(Number);
      const end = new Date(year, m, 1).toISOString().split("T")[0];
      query = query.gte("date", start).lt("date", end);
    }

    if (type === "income" || type === "expense") {
      query = query.eq("type", type);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (status === "confirmed" || status === "pending" || status === "cancelled") {
      query = query.eq("status", status);
    }

    if (
      payment_method &&
      [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "transferencia",
        "boleto",
        "nao_informado",
        "outros",
      ].includes(payment_method)
    ) {
      query = query.eq("payment_method", payment_method);
    }

    if (search) {
      const safe = search.replace(/%/g, "").slice(0, 80);
      if (safe.length > 0) {
        query = query.ilike("description", `%${safe}%`);
      }
    }

    const { data, error } = await query;

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const row: Record<string, unknown> = {
      date,
      type,
      category,
      description,
      amount,
      created_by: user.id,
    };

    if (payment_method != null) row.payment_method = payment_method;
    if (status != null) row.status = status;
    if (supplier_id !== undefined) row.supplier_id = supplier_id || null;
    if (notes !== undefined) row.notes = notes || null;
    if (reference_code !== undefined) row.reference_code = reference_code || null;
    if (invoice_file_url !== undefined) row.invoice_file_url = invoice_file_url || null;

    const { data, error } = await supabase
      .from("finance_entries")
      .insert(row)
      .select()
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
