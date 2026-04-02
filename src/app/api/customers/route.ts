import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createAnonOnlyClient } from "@/lib/supabase/anon-only";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    const phone =
      typeof body.phone === "string"
        ? body.phone.replace(/\D/g, "").slice(0, 15)
        : "";
    const birth_date =
      typeof body.birth_date === "string" ? body.birth_date.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }
    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: "Telefone inválido" },
        { status: 400 }
      );
    }
    if (!birth_date || !/^\d{4}-\d{2}-\d{2}$/.test(birth_date)) {
      return NextResponse.json(
        { error: "Data de nascimento inválida" },
        { status: 400 }
      );
    }

    const row = { name, phone, birth_date };

    const service = createServiceRoleClient();
    if (service) {
      const { data, error } = await service
        .from("customers")
        .insert(row)
        .select()
        .single();
      if (error)
        return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json(data, { status: 201 });
    }

    const supabase = createAnonOnlyClient();
    const { error } = await supabase.from("customers").insert(row);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
