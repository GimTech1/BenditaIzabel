import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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

    const { data: card, error: cardError } = await supabase
      .from("trello_cards")
      .select("*")
      .eq("id", id)
      .single();

    if (cardError)
      return NextResponse.json({ error: cardError.message }, { status: 400 });

    const [checklists, labels, comments, attachments, assignees] =
      await Promise.all([
        supabase
          .from("trello_checklists")
          .select("*, trello_checklist_items(*)")
          .eq("card_id", id),
        supabase
          .from("trello_card_labels")
          .select("*, trello_labels(*)")
          .eq("card_id", id),
        supabase
          .from("trello_comments")
          .select("*, profiles(full_name, avatar_url)")
          .eq("card_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("trello_attachments")
          .select("*")
          .eq("card_id", id),
        supabase
          .from("trello_card_assignees")
          .select("*, profiles(full_name, avatar_url)")
          .eq("card_id", id),
      ]);

    return NextResponse.json({
      ...card,
      checklists: checklists.data ?? [],
      labels: labels.data ?? [],
      comments: comments.data ?? [],
      attachments: attachments.data ?? [],
      assignees: assignees.data ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const allowedFields = [
      "title",
      "description",
      "list_id",
      "position",
      "due_date",
      "cover_color",
      "progress",
      "priority",
      "is_completed",
      "completed_at",
      "completed_by",
      "assigned_to",
    ];

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) update[field] = body[field];
    }

    const { data, error } = await supabase
      .from("trello_cards")
      .update(update)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      .from("trello_cards")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
