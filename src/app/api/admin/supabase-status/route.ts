import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const configured = isSupabaseConfigured();
  if (!configured) {
    return NextResponse.json({
      connected: false,
      message: "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({
      connected: false,
      message: "Falha ao inicializar cliente Supabase.",
    });
  }

  try {
    const { count, error } = await supabase
      .from("lp_visits")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message,
        message: "Conexão estabelecida, mas as tabelas ainda precisam ser criadas. Execute o schema.sql no SQL Editor do Supabase.",
      });
    }

    return NextResponse.json({
      connected: true,
      visitsCount: count || 0,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: err?.message || "Erro desconhecido ao conectar com Supabase",
    });
  }
}
