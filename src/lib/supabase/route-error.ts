import type { PostgrestError } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as PostgrestError).message === "string"
  );
}

/**
 * Converte erro do PostgREST/Supabase em resposta HTTP adequada.
 * Antes tudo virava 400; muitos erros são 401/403/500.
 */
export function supabaseErrorResponse(error: unknown): NextResponse {
  if (!isPostgrestError(error)) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }

  const msg = error.message;
  const code = error.code;
  const details = error.details;
  const hint = error.hint;

  const body = { error: msg, code, details, hint };

  if (
    code === "PGRST301" ||
    /jwt|session|expired|invalid/i.test(msg)
  ) {
    return NextResponse.json(
      { ...body, error: "Sessão inválida ou expirada. Faça login de novo." },
      { status: 401 }
    );
  }

  if (
    code === "42501" ||
    /permission denied|rls/i.test(msg)
  ) {
    return NextResponse.json(body, { status: 403 });
  }

  if (
    /infinite recursion detected in policy/i.test(msg)
  ) {
    return NextResponse.json(
      {
        ...body,
        error: msg,
        hint:
          hint ??
          "Recursão infinita nas policies de `profiles`. Rode no SQL Editor do Supabase: `supabase/migrations/05_profiles_rls_no_recursion.sql` (substitui políticas por funções SECURITY DEFINER).",
      },
      { status: 500 }
    );
  }

  if (
    code === "42P01" ||
    /relation .* does not exist/i.test(msg)
  ) {
    return NextResponse.json(
      {
        ...body,
        hint:
          hint ??
          "Tabelas não encontradas. Execute as migrations 00–03 no SQL Editor do Supabase.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(body, { status: 500 });
}
