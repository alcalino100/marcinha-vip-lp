import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { syncWebhookSiteOrders, DEFAULT_WEBHOOK_SITE_TOKEN } from "@/lib/webhooksite";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    let urlOrToken = DEFAULT_WEBHOOK_SITE_TOKEN;
    try {
      const body = await req.json();
      if (body?.url) urlOrToken = body.url;
      else if (body?.token) urlOrToken = body.token;
    } catch {}

    const result = await syncWebhookSiteOrders(urlOrToken);

    return NextResponse.json({
      success: true,
      message: `${result.imported} pedidos/eventos da FireBot importados e sincronizados com sucesso do Webhook.site!`,
      totalRequests: result.total,
      importedCount: result.imported,
      orders: result.orders,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao sincronizar com Webhook.site",
        details: err?.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await syncWebhookSiteOrders(DEFAULT_WEBHOOK_SITE_TOKEN);
    return NextResponse.json({
      success: true,
      token: DEFAULT_WEBHOOK_SITE_TOKEN,
      totalRequests: result.total,
      importedCount: result.imported,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}
