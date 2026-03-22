import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const STATUS_ORDER = ["attention", "pending", "expired", "ok"];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("title");

    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });

    const sorted = (data ?? []).sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        a.title.localeCompare(b.title)
    );

    return NextResponse.json(sorted);
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
    const { title, category, status, expiry_date, notes, file_url } = body;

    const { data, error } = await supabase
      .from("documents")
      .insert({
        title,
        category,
        status,
        expiry_date: expiry_date || null,
        notes: notes || null,
        file_url: file_url || null,
      })
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
