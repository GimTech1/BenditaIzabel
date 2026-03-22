import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const STATUSES = ["novo", "em_preparo", "entregue", "cancelado"] as const;

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

    const body = await request.json();
    const status = body.status as string;
    if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("menu_orders")
      .update({ status })
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
