import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const config = getConfig();

    if (!password || password !== config.adminPassword) {
      return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token: Buffer.from(password).toString("base64"),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erro de autenticação" }, { status: 500 });
  }
}
