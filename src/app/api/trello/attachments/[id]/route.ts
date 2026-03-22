import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    const { data: attachment } = await supabase
      .from("trello_attachments")
      .select("*")
      .eq("id", id)
      .single();

    if (!attachment)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (attachment.uploaded_by !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(attachment.file_url);
    const storagePath = url.pathname.split("/trello-attachments/")[1];

    if (storagePath) {
      await supabase.storage
        .from("trello-attachments")
        .remove([decodeURIComponent(storagePath)]);
    }

    const { error } = await supabase
      .from("trello_attachments")
      .delete()
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
