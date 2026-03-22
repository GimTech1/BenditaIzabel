import { createClient } from "@/lib/supabase/server";
import { canManageMenuItems } from "@/lib/cardapio-access";
import { NextResponse } from "next/server";

async function assertMenuStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return canManageMenuItems(profile?.role);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertMenuStaff(supabase, user.id)))
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const body = await request.json();
    const row: Record<string, unknown> = {};
    if (body.name != null) row.name = String(body.name).trim();
    if (body.description !== undefined)
      row.description =
        body.description == null ? null : String(body.description).trim();
    if (body.category != null) row.category = String(body.category).trim();
    if (typeof body.price === "number" && body.price >= 0) row.price = body.price;
    if (body.image_url !== undefined)
      row.image_url =
        body.image_url == null ? null : String(body.image_url).trim() || null;
    if (typeof body.is_available === "boolean")
      row.is_available = body.is_available;
    if (typeof body.sort_order === "number") row.sort_order = body.sort_order;

    const { data, error } = await supabase
      .from("menu_items")
      .update(row)
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
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await assertMenuStaff(supabase, user.id)))
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
