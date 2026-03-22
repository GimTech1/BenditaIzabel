import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: checklistId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { text } = body;

    const { data: maxItem } = await supabase
      .from("trello_checklist_items")
      .select("position")
      .eq("checklist_id", checklistId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (maxItem?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("trello_checklist_items")
      .insert({
        checklist_id: checklistId,
        text,
        position,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
