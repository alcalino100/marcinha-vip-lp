import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    let visitId: string | undefined = undefined;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      visitId = body.visitId;
    } else if (contentType.includes("text/plain")) {
      const text = await req.text();
      try {
        const parsed = JSON.parse(text);
        visitId = parsed.visitId;
      } catch {
        visitId = text.trim();
      }
    }

    const recorded = recordClick(visitId);

    return NextResponse.json({
      success: true,
      recorded,
    });
  } catch (error) {
    console.error("Erro ao registrar clique:", error);
    return NextResponse.json({ success: false, error: "Falha ao gravar clique" }, { status: 500 });
  }
}
