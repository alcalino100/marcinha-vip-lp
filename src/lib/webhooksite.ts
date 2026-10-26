import { OrderEvent, OrderStatus } from "./types";
import { upsertOrderAsync } from "./db";

export const DEFAULT_WEBHOOK_SITE_TOKEN = "2137c6fe-7a92-43c9-bdbd-8bcb8d8d33db";

export function extractTokenFromUrl(urlOrToken: string): string {
  if (!urlOrToken) return DEFAULT_WEBHOOK_SITE_TOKEN;
  const clean = urlOrToken.trim();
  const match = clean.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  return match ? match[1] : clean;
}

export function parseFirebotItem(contentRaw: string | Record<string, any>, fallbackUuid?: string): OrderEvent | null {
  try {
    const body: Record<string, any> = typeof contentRaw === "string" ? JSON.parse(contentRaw) : contentRaw;
    if (!body || typeof body !== "object") return null;

    const rawEvent = String(body.event || body.type || body.action || "").toLowerCase();

    // Filtra apenas eventos relevantes de venda, pagamento, PIX ou saque
    const isSaleEvent =
      rawEvent.startsWith("venda.") ||
      rawEvent.startsWith("firebot.") ||
      rawEvent.startsWith("order.") ||
      rawEvent.startsWith("pix.") ||
      rawEvent.startsWith("saque.") ||
      body.data?.status ||
      body.payload?.amount;

    if (!isSaleEvent) return null;

    const data = body.data || body.payload || {};

    // Normaliza Status
    let status: OrderStatus = "pending";
    const statusStr = String(data.status || rawEvent).toUpperCase();
    if (
      rawEvent.includes("paga") ||
      rawEvent.includes("paid") ||
      rawEvent.includes("aprovado") ||
      statusStr === "PAID" ||
      statusStr === "CONCLUIDO" ||
      statusStr === "PAGO" ||
      statusStr === "APROVADO"
    ) {
      status = "paid";
    } else if (
      rawEvent.includes("pendente") ||
      rawEvent.includes("pending") ||
      rawEvent.includes("created") ||
      rawEvent.includes("pix_created") ||
      statusStr === "PENDING" ||
      statusStr === "AGUARDANDO"
    ) {
      status = "pending";
    } else if (
      rawEvent.includes("cancelad") ||
      rawEvent.includes("expirad") ||
      statusStr === "EXPIRED" ||
      statusStr === "CANCELLED"
    ) {
      status = "expired";
    }

    // ID do pedido / transação
    const id = String(
      data.id ||
      data.transactionId ||
      data.saleId ||
      fallbackUuid ||
      `fb_${Date.now()}`
    );

    // Valor da venda em R$
    let amount = Number(data.amount || data.value || data.total || 0);
    if (isNaN(amount)) amount = 0;

    // Dados do Cliente
    const customerName = String(
      data.customerName ||
      data.customer?.name ||
      data.name ||
      "Cliente FireBot"
    );

    const customerEmail = String(
      data.customerEmail ||
      data.customer?.email ||
      data.email ||
      ""
    );

    const customerPhone = String(
      data.customerPhone ||
      data.customer?.phone ||
      data.phone ||
      ""
    );

    const productName = String(
      data.productName ||
      data.plan ||
      data.product ||
      "Acesso VIP Marcinha"
    );

    // Rastreamento UTM & SRC
    const utm_source = String(
      data.utm_source ||
      data.src ||
      body.utm_source ||
      body.src ||
      "direto"
    );

    const utm_campaign = String(
      data.utm_campaign ||
      data.sck ||
      body.utm_campaign ||
      body.sck ||
      "geral"
    );

    const createdAt = String(
      data.createdAt ||
      body.timestamp ||
      new Date().toISOString()
    );

    return {
      id,
      platform: "firebot",
      event: rawEvent || "venda.paga",
      status,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      telegramId: data.telegram_id || data.chat_id || "",
      telegramUsername: data.telegram_username || data.username || "",
      productName,
      utm_source,
      utm_medium: data.utm_medium || "nenhum",
      utm_campaign,
      src: utm_source,
      sck: utm_campaign,
      rawPayload: body,
      createdAt,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    return null;
  }
}

export async function syncWebhookSiteOrders(
  tokenOrUrl: string = DEFAULT_WEBHOOK_SITE_TOKEN
): Promise<{ total: number; imported: number; orders: OrderEvent[] }> {
  const token = extractTokenFromUrl(tokenOrUrl);
  const apiUrl = `https://webhook.site/token/${token}/requests`;

  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Webhook.site retornou status HTTP ${res.status}`);
    }

    const json = await res.json();
    const items = Array.isArray(json.data) ? json.data : [];
    const importedOrders: OrderEvent[] = [];

    // Processa do mais antigo para o mais novo para manter histórico cronológico
    const reversed = [...items].reverse();

    for (const item of reversed) {
      const order = parseFirebotItem(item.content, item.uuid);
      if (order) {
        await upsertOrderAsync(order);
        importedOrders.push(order);
      }
    }

    return {
      total: items.length,
      imported: importedOrders.length,
      orders: importedOrders,
    };
  } catch (error) {
    console.error("Erro ao sincronizar com Webhook.site:", error);
    throw error;
  }
}
