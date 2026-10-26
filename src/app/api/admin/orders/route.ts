import { NextRequest, NextResponse } from "next/server";
import { getOrdersAsync, resetOrdersAsync } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";
import { OrderEvent, OrdersSummary } from "@/lib/types";
import { syncWebhookSiteOrders } from "@/lib/webhooksite";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let orders = await getOrdersAsync();

  // Se não houver pedidos no banco, sincroniza automaticamente do Webhook.site
  if (orders.length === 0) {
    try {
      await syncWebhookSiteOrders();
      orders = await getOrdersAsync();
    } catch {}
  }

  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "all";
  const filterSource = url.searchParams.get("source") || "";
  const filterStatus = url.searchParams.get("status") || "";

  const now = new Date();
  const filteredOrders = orders.filter((o) => {
    const oDate = new Date(o.createdAt);

    if (period === "today") {
      const isToday =
        oDate.getDate() === now.getDate() &&
        oDate.getMonth() === now.getMonth() &&
        oDate.getFullYear() === now.getFullYear();
      if (!isToday) return false;
    } else if (period === "7d") {
      const diffTime = Math.abs(now.getTime() - oDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 7) return false;
    } else if (period === "30d") {
      const diffTime = Math.abs(now.getTime() - oDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 30) return false;
    }

    if (filterSource && o.utm_source !== filterSource) {
      return false;
    }

    if (filterStatus && o.status !== filterStatus) {
      return false;
    }

    return true;
  });

  // Métricas Principais
  const totalOrders = filteredOrders.length;
  const paidOrdersList = filteredOrders.filter((o) => o.status === "paid");
  const paidOrders = paidOrdersList.length;
  const pendingOrders = filteredOrders.filter((o) => o.status === "pending").length;
  const expiredOrders = filteredOrders.filter((o) => o.status === "expired").length;
  const refundedOrders = filteredOrders.filter((o) => o.status === "refunded").length;

  const totalRevenue = Number(
    paidOrdersList.reduce((acc, cur) => acc + (cur.amount || 0), 0).toFixed(2)
  );

  const averageTicket = paidOrders > 0 ? Number((totalRevenue / paidOrders).toFixed(2)) : 0;
  const conversionRate = totalOrders > 0 ? Number(((paidOrders / totalOrders) * 100).toFixed(1)) : 0;

  // Agrupamento por UTM Source
  const sourceMap: Record<string, { orders: number; paid: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    const src = o.utm_source || "direto";
    if (!sourceMap[src]) sourceMap[src] = { orders: 0, paid: 0, revenue: 0 };
    sourceMap[src].orders += 1;
    if (o.status === "paid") {
      sourceMap[src].paid += 1;
      sourceMap[src].revenue += o.amount || 0;
    }
  });

  const topSources = Object.entries(sourceMap)
    .map(([source, stats]) => ({
      source,
      orders: stats.orders,
      paid: stats.paid,
      revenue: Number(stats.revenue.toFixed(2)),
      cr: stats.orders > 0 ? Number(((stats.paid / stats.orders) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Agrupamento por Campanha
  const campaignMap: Record<string, { orders: number; paid: number; revenue: number }> = {};
  filteredOrders.forEach((o) => {
    const camp = o.utm_campaign || "geral";
    if (!campaignMap[camp]) campaignMap[camp] = { orders: 0, paid: 0, revenue: 0 };
    campaignMap[camp].orders += 1;
    if (o.status === "paid") {
      campaignMap[camp].paid += 1;
      campaignMap[camp].revenue += o.amount || 0;
    }
  });

  const topCampaigns = Object.entries(campaignMap)
    .map(([campaign, stats]) => ({
      campaign,
      orders: stats.orders,
      paid: stats.paid,
      revenue: Number(stats.revenue.toFixed(2)),
      cr: stats.orders > 0 ? Number(((stats.paid / stats.orders) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const lastEventAt = orders.length > 0 ? orders[0].createdAt : undefined;

  const summary: OrdersSummary = {
    totalRevenue,
    totalOrders,
    paidOrders,
    pendingOrders,
    expiredOrders,
    refundedOrders,
    conversionRate,
    averageTicket,
    recentOrders: filteredOrders.slice(0, 150),
    topSources,
    topCampaigns,
    lastEventAt,
  };

  return NextResponse.json(summary, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  await resetOrdersAsync();
  return NextResponse.json({ success: true, message: "Todos os pedidos foram zerados" });
}
