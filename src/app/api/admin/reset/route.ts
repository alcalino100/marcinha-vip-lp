import { NextRequest, NextResponse } from "next/server";
import { resetStats } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  resetStats();
  return NextResponse.json({ success: true, message: "Estatísticas limpas com sucesso" });
}
