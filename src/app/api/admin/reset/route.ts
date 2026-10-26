import { NextRequest, NextResponse } from "next/server";
import { resetStatsAsync } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await resetStatsAsync();
  return NextResponse.json({ success: true, message: "Estatísticas limpas com sucesso" });
}
