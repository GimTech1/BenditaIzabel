import { NextResponse } from "next/server";

/** Retorna resposta 503 se variáveis públicas do Supabase estiverem ausentes. */
export function supabaseEnvMissingResponse(): NextResponse | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json(
      {
        error:
          "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local (projeto correto).",
        code: "MISSING_ENV",
      },
      { status: 503 }
    );
  }
  return null;
}
