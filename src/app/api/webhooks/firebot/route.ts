import { NextRequest, NextResponse } from "next/server";
import { upsertOrderAsync, getVisitsAsync } from "@/lib/db";
import { OrderEvent, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function normalizeStatus(rawEvent: string, rawStatus: string): OrderStatus {
  const combined = `${rawEvent} ${rawStatus}`.toLowerCase();

  if (
    combined.includes("paid") ||
    combined.includes("paga") ||
    combined.includes("pago") ||
    combined.includes("approved") ||
    combined.includes("aprovado") ||
    combined.includes("liquidado") ||
    combined.includes("concluido") ||
    combined.includes("success") ||
    combined.includes("completed")
  ) {
    return "paid";
  }

  if (
    combined.includes("expired") ||
    combined.includes("expirado") ||
    combined.includes("cancelled") ||
    combined.includes("cancelado") ||
    combined.includes("recusado") ||
    combined.includes("failed") ||
    combined.includes("falha")
  ) {
    return "expired";
  }

  if (
    combined.includes("refunded") ||
    combined.includes("reembolsado") ||
    combined.includes("estornado") ||
    combined.includes("chargeback")
  ) {
    return "refunded";
  }

  return "pending";
}

function normalizeAmount(val: any): number {
  if (val === undefined || val === null) return 0;

  if (typeof val === "number") {
    // Se for inteiro maior que 500 sem casas decimais (ex: 2990 centavos = R$ 29.90)
    if (val >= 500 && Math.floor(val) === val && val < 500000) {
      return Number((val / 100).toFixed(2));
    }
    return Number(val.toFixed(2));
  }

  if (typeof val === "string") {
    const clean = val.replace(/[R$\s]/g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    if (!isNaN(parsed)) {
      if (!val.includes(".") && !val.includes(",") && parsed >= 500 && parsed % 1 === 0) {
        return Number((parsed / 100).toFixed(2));
      }
      return Number(parsed.toFixed(2));
    }
  }

  return 0;
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    platform: "firebot",
    message: "Endpoint de Webhook do FireBot ativo e pronto para receber notificações POST de PIX Gerado e PIX Pago.",
    supportedEvents: [
      "pix_created / pix_gerado (PIX Gerado)",
      "pix_paid / pix_pago / approved (PIX Pago/Aprovado)",
      "pix_expired (PIX Expirado)",
    ],
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const entries: Record<string, any> = {};
      formData.forEach((val, key) => {
        entries[key] = val;
      });
      body = entries;
    } else {
      try {
        body = await req.json();
      } catch {
        const text = await req.text();
        body = { rawText: text };
      }
    }

    // Identificação de Evento & Status
    const rawEvent = String(
      body.event ||
      body.type ||
      body.action ||
      body.data?.event ||
      body.data?.type ||
      body.status ||
      "pix_created"
    );

    const rawStatus = String(
      body.status ||
      body.data?.status ||
      body.payment_status ||
      rawEvent
    );

    const status = normalizeStatus(rawEvent, rawStatus);

    // ID da Transação / Pedido
    const id = String(
      body.data?.id ||
      body.data?.transactionId ||
      body.data?.saleId ||
      body.id ||
      body.transaction_id ||
      body.transactionId ||
      body.payment_id ||
      body.paymentId ||
      body.order_id ||
      body.orderId ||
      body.charge_id ||
      body.pix_id ||
      body.code ||
      `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    );

    // Valor da Transação
    const rawValue =
      body.data?.amount ??
      body.data?.value ??
      body.data?.price ??
      body.data?.total ??
      body.amount ??
      body.value ??
      body.price ??
      body.total ??
      body.valor ??
      29.9;

    const amount = normalizeAmount(rawValue);

    // Identificação do Usuário Telegram / Cliente
    const telegramId = String(
      body.data?.telegram_id ||
      body.data?.chat_id ||
      body.data?.user?.id ||
      body.telegram_id ||
      body.telegramId ||
      body.chat_id ||
      body.chatId ||
      body.user_id ||
      body.userId ||
      body.user?.id ||
      body.customer?.telegram_id ||
      body.customer?.chat_id ||
      ""
    );

    const telegramUsername = String(
      body.data?.telegram_username ||
      body.data?.user?.username ||
      body.telegram_username ||
      body.telegramUsername ||
      body.username ||
      body.user?.username ||
      body.customer?.username ||
      ""
    ).replace(/^@/, "");

    const customerName = String(
      body.data?.customerName ||
      body.data?.customer?.name ||
      body.data?.user?.name ||
      body.customer_name ||
      body.customer?.name ||
      body.user?.name ||
      body.name ||
      telegramUsername ||
      "Cliente Telegram"
    );

    const customerEmail = String(
      body.data?.customerEmail ||
      body.data?.customer?.email ||
      body.customer_email ||
      body.customer?.email ||
      body.user?.email ||
      body.email ||
      ""
    );

    const customerPhone = String(
      body.data?.customerPhone ||
      body.data?.customer?.phone ||
      body.customer_phone ||
      body.customer?.phone ||
      body.phone ||
      body.telefone ||
      ""
    );

    // Produto
    const productName = String(
      body.data?.productName ||
      body.data?.plan ||
      body.product_name ||
      body.productName ||
      body.product ||
      body.plan ||
      body.plano ||
      body.title ||
      "Acesso VIP Marcinha"
    );

    // Rastreamento UTM & SRC
    let utm_source = String(
      body.utm_source ||
      body.utmSource ||
      body.utm?.source ||
      body.src ||
      body.metadata?.utm_source ||
      body.metadata?.src ||
      body.tracking?.utm_source ||
      body.custom_fields?.utm_source ||
      body.data?.utm_source ||
      ""
    );

    let utm_campaign = String(
      body.utm_campaign ||
      body.utmCampaign ||
      body.utm?.campaign ||
      body.sck ||
      body.metadata?.utm_campaign ||
      body.metadata?.sck ||
      body.tracking?.utm_campaign ||
      body.custom_fields?.utm_campaign ||
      body.data?.utm_campaign ||
      ""
    );

    let utm_medium = String(
      body.utm_medium ||
      body.utmMedium ||
      body.utm?.medium ||
      body.metadata?.utm_medium ||
      body.data?.utm_medium ||
      ""
    );

    let utm_content = String(
      body.utm_content ||
      body.utmContent ||
      body.metadata?.utm_content ||
      body.data?.utm_content ||
      ""
    );

    let utm_term = String(
      body.utm_term ||
      body.utmTerm ||
      body.metadata?.utm_term ||
      body.data?.utm_term ||
      ""
    );

    const src = String(body.src || utm_source || "");
    const sck = String(body.sck || utm_campaign || "");

    // Atribuição Inteligente: Se Firebot não passou UTM, busca no último clique recente da LP
    if (!utm_source || utm_source === "direto") {
      try {
        const recentVisits = await getVisitsAsync();
        const clickedVisit = recentVisits.find((v) => v.clicked && v.utm_source && v.utm_source !== "direto");
        if (clickedVisit) {
          utm_source = clickedVisit.utm_source;
          if (!utm_campaign) utm_campaign = clickedVisit.utm_campaign;
          if (!utm_medium) utm_medium = clickedVisit.utm_medium;
        }
      } catch (err) {
        console.error("Falha ao buscar UTM de visita recente:", err);
      }
    }

    const order: OrderEvent = {
      id,
      platform: "firebot",
      event: rawEvent,
      status,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      telegramId,
      telegramUsername,
      productName,
      utm_source: utm_source || "direto",
      utm_medium: utm_medium || "nenhum",
      utm_campaign: utm_campaign || "geral",
      utm_content,
      utm_term,
      src,
      sck,
      rawPayload: body,
      createdAt: body.created_at || body.timestamp || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await upsertOrderAsync(order);

    return NextResponse.json(
      {
        success: true,
        message: "Webhook do FireBot processado com sucesso!",
        order: {
          id: order.id,
          event: order.event,
          status: order.status,
          amount: order.amount,
          customer: order.customerName,
          telegramUsername: order.telegramUsername,
          utm_source: order.utm_source,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao processar webhook do FireBot:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Erro interno ao processar webhook",
        details: error?.message,
      },
      { status: 500 }
    );
  }
}
