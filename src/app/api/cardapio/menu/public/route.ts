import { createAnonOnlyClient } from "@/lib/supabase/anon-only";
import { NextResponse } from "next/server";

/** Cardápio só com itens disponíveis — sempre como visitante (para tablet na mesa). */
export async function GET() {
  try {
    const supabase = createAnonOnlyClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

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
