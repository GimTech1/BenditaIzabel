import { createClient } from "@/lib/supabase/server";
import { supabaseEnvMissingResponse } from "@/lib/supabase/env-check";
import { supabaseErrorResponse } from "@/lib/supabase/route-error";
import { NextResponse } from "next/server";

function serverErrorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : "Erro interno do servidor";
  console.error("[api/trello/boards]", e);
  return NextResponse.json(
    {
      error: message,
      hint: "Veja o terminal onde roda `next dev` para o stack completo.",
    },
    { status: 500 }
  );
}

export async function GET() {
  try {
    const envErr = supabaseEnvMissingResponse();
    if (envErr) return envErr;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("trello_boards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/trello/boards] PostgREST:", error.message, error.code, error.details, error.hint);
      return supabaseErrorResponse(error);
    }
    return NextResponse.json(data);
  } catch (e) {
    return serverErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const envErr = supabaseEnvMissingResponse();
    if (envErr) return envErr;

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
    const { name, department_id, visibility, visible_to_user_id } = body;

    const { data, error } = await supabase
      .from("trello_boards")
      .insert({
        name,
        department_id,
        visibility: visibility ?? "department",
        visible_to_user_id: visible_to_user_id ?? null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return supabaseErrorResponse(error);
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return serverErrorResponse(e);
  }
}
