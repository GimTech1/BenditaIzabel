import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: lists, error: listsError } = await supabase
      .from("trello_lists")
      .select("*")
      .eq("board_id", boardId)
      .order("position", { ascending: true });

    if (listsError)
      return NextResponse.json({ error: listsError.message }, { status: 400 });

    if (!lists || lists.length === 0) return NextResponse.json([]);

    const listIds = lists.map((l) => l.id);
    const { data: cards, error: cardsError } = await supabase
      .from("trello_cards")
      .select("*")
      .in("list_id", listIds)
      .order("position", { ascending: true });

    if (cardsError)
      return NextResponse.json({ error: cardsError.message }, { status: 400 });

    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: (cards ?? []).filter((card) => card.list_id === list.id),
    }));

    return NextResponse.json(listsWithCards);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: boardId } = await params;
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
    const { title, color } = body;

    const { data: maxList } = await supabase
      .from("trello_lists")
      .select("position")
      .eq("board_id", boardId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const position = (maxList?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("trello_lists")
      .insert({
        board_id: boardId,
        title,
        color: color ?? null,
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
