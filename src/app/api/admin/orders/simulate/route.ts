import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { upsertOrderAsync } from "@/lib/db";
import { OrderEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const type = body.type || "paid"; // 'created' ou 'paid'
    const amount = Number(body.amount) || 29.9;
    const utm_source = body.utm_source || "tiktok_ads";
    const utm_campaign = body.utm_campaign || "campanha_vip_01";
    const username = body.username || "lead_teste";

    const simId = `sim_${Date.now()}`;
    const order: OrderEvent = {
      id: simId,
      platform: "firebot",
      event: type === "paid" ? "pix_paid" : "pix_created",
      status: type === "paid" ? "paid" : "pending",
      amount,
      customerName: `Usuário @${username}`,
      customerEmail: `${username}@exemplo.com`,
      customerPhone: "11988887777",
      telegramId: String(Math.floor(100000000 + Math.random() * 900000000)),
      telegramUsername: username,
      productName: "Acesso VIP Marcinha (Simulação)",
      utm_source,
      utm_medium: "cpc",
      utm_campaign,
      src: utm_source,
      sck: utm_campaign,
      rawPayload: {
        simulated: true,
        type,
        amount,
        note: "Evento simulado pelo painel administrativo para teste de webhook",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await upsertOrderAsync(order);

    return NextResponse.json({
      success: true,
      message: type === "paid" ? "Simulação de PIX Pago realizada!" : "Simulação de PIX Gerado realizada!",
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Falha na simulação", details: err?.message }, { status: 500 });
  }
}
