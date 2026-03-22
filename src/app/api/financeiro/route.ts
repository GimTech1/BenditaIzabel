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

    const month = request.nextUrl.searchParams.get("month");

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
    const { date, type, category, description, amount } = body;

    const { data, error } = await supabase
      .from("finance_entries")
      .insert({ date, type, category, description, amount, created_by: user.id })
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
