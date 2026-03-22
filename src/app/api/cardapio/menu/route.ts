import { createClient } from "@/lib/supabase/server";
import { canManageMenuItems } from "@/lib/cardapio-access";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let q = supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!user) {
      q = q.eq("is_available", true);
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

    if (!canManageMenuItems(profile?.role)) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      price,
      image_url,
      is_available,
      sort_order,
    } = body;

    if (!name || typeof price !== "number" || price < 0) {
      return NextResponse.json(
        { error: "Nome e preço válidos são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        name: String(name).trim(),
        description: description != null ? String(description).trim() : null,
        category: category != null ? String(category).trim() : "geral",
        price,
        image_url: image_url != null ? String(image_url).trim() || null : null,
        is_available: is_available !== false,
        sort_order: typeof sort_order === "number" ? sort_order : 0,
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
