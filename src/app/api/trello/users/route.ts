import { createClient } from "@/lib/supabase/server";
import { supabaseEnvMissingResponse } from "@/lib/supabase/env-check";
import { supabaseErrorResponse } from "@/lib/supabase/route-error";
import { NextResponse } from "next/server";

function serverErrorResponse(e: unknown) {
  const message = e instanceof Error ? e.message : "Erro interno do servidor";
  console.error("[api/trello/users]", e);
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
      .from("profiles")
      .select("id, full_name, email, avatar_url, role");

    if (error) {
      console.error("[api/trello/users] PostgREST:", error.message, error.code, error.details, error.hint);
      return supabaseErrorResponse(error);
    }
    return NextResponse.json(data);
  } catch (e) {
    return serverErrorResponse(e);
  }
}
