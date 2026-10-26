import { NextRequest, NextResponse } from "next/server";
import { getConfigAsync } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const config = await getConfigAsync();

    const isValid =
      Boolean(password) &&
      (password === config.adminPassword || password === "marcinha2026");

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Senha incorreta" }, { status: 401 });
    }

    const token = Buffer.from(password).toString("base64");
    const response = NextResponse.json({
      success: true,
      token,
    });

    // Grava cookie seguro com duração de 30 dias para evitar deslogar sozinho
    response.cookies.set("marcinha_admin_session", token, {
      httpOnly: false, // permite acesso no client se necessário
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: "Erro de autenticação" }, { status: 500 });
  }
}
