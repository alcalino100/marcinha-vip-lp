import { NextRequest, NextResponse } from "next/server";
import { getConfigAsync, updateConfigAsync } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const config = await getConfigAsync();
  return NextResponse.json(config);
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await updateConfigAsync(body);
    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar configuração" }, { status: 500 });
  }
}
