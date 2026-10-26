import { NextRequest, NextResponse } from "next/server";
import { getVisitsAsync } from "@/lib/db";
import { checkAdminAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const visits = await getVisitsAsync();

  // Parâmetros de filtro
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "all"; // 'today', '7d', '30d', 'all'
  const filterSource = url.searchParams.get("source") || "";

  const now = new Date();
  const filteredVisits = visits.filter((v) => {
    const vDate = new Date(v.timestamp);

    if (period === "today") {
      const isToday =
        vDate.getDate() === now.getDate() &&
        vDate.getMonth() === now.getMonth() &&
        vDate.getFullYear() === now.getFullYear();
      if (!isToday) return false;
    } else if (period === "7d") {
      const diffTime = Math.abs(now.getTime() - vDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 7) return false;
    } else if (period === "30d") {
      const diffTime = Math.abs(now.getTime() - vDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 30) return false;
    }

    if (filterSource && v.utm_source !== filterSource) {
      return false;
    }

    return true;
  });

  const totalVisits = filteredVisits.length;
  const uniqueIps = new Set(filteredVisits.map((v) => v.ip));
  const uniqueVisits = uniqueIps.size;
  const totalClicks = filteredVisits.filter((v) => v.clicked).length;
  const conversionRate = totalVisits > 0 ? ((totalClicks / totalVisits) * 100).toFixed(1) : "0.0";

  // Agrupamento por UTM Source
  const sourceMap: Record<string, { visits: number; clicks: number }> = {};
  filteredVisits.forEach((v) => {
    const src = v.utm_source || "direto";
    if (!sourceMap[src]) sourceMap[src] = { visits: 0, clicks: 0 };
    sourceMap[src].visits += 1;
    if (v.clicked) sourceMap[src].clicks += 1;
  });

  const topSources = Object.entries(sourceMap)
    .map(([source, stats]) => ({
      source,
      visits: stats.visits,
      clicks: stats.clicks,
      cr: stats.visits > 0 ? ((stats.clicks / stats.visits) * 100).toFixed(1) : "0.0",
    }))
    .sort((a, b) => b.visits - a.visits);

  // Agrupamento por UTM Campaign
  const campaignMap: Record<string, { visits: number; clicks: number }> = {};
  filteredVisits.forEach((v) => {
    const camp = v.utm_campaign || "nenhuma";
    if (!campaignMap[camp]) campaignMap[camp] = { visits: 0, clicks: 0 };
    campaignMap[camp].visits += 1;
    if (v.clicked) campaignMap[camp].clicks += 1;
  });

  const topCampaigns = Object.entries(campaignMap)
    .map(([campaign, stats]) => ({
      campaign,
      visits: stats.visits,
      clicks: stats.clicks,
      cr: stats.visits > 0 ? ((stats.clicks / stats.visits) * 100).toFixed(1) : "0.0",
    }))
    .sort((a, b) => b.visits - a.visits);

  // Agrupamento por Dispositivo (Mobile vs Desktop vs Tablet)
  const deviceMap: Record<string, number> = {};
  filteredVisits.forEach((v) => {
    const dev = v.device || "Mobile";
    deviceMap[dev] = (deviceMap[dev] || 0) + 1;
  });

  // Agrupamento por Sistema Operacional
  const osMap: Record<string, number> = {};
  filteredVisits.forEach((v) => {
    const os = v.os || "Outro";
    osMap[os] = (osMap[os] || 0) + 1;
  });

  // Agrupamento por Navegador (incluindo In-App Browsers como Instagram e TikTok)
  const browserMap: Record<string, number> = {};
  filteredVisits.forEach((v) => {
    const b = v.browser || "Outro";
    browserMap[b] = (browserMap[b] || 0) + 1;
  });

  // Agrupamento por Localização (Cidade / Estado)
  const locationMap: Record<string, number> = {};
  filteredVisits.forEach((v) => {
    const loc = v.city && v.region ? `${v.city}, ${v.region}` : v.city || v.country || "Desconhecido";
    locationMap[loc] = (locationMap[loc] || 0) + 1;
  });

  const topLocations = Object.entries(locationMap)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Distribuição por Hora (para ver horários de pico de tráfego)
  const hourlyVisits: number[] = new Array(24).fill(0);
  const hourlyClicks: number[] = new Array(24).fill(0);
  filteredVisits.forEach((v) => {
    const hour = new Date(v.timestamp).getHours();
    hourlyVisits[hour] += 1;
    if (v.clicked) hourlyClicks[hour] += 1;
  });

  return NextResponse.json({
    period,
    totalVisits,
    uniqueVisits,
    totalClicks,
    conversionRate: Number(conversionRate),
    topSources,
    topCampaigns,
    devices: deviceMap,
    os: osMap,
    browsers: browserMap,
    topLocations,
    hourly: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
      visits: hourlyVisits,
      clicks: hourlyClicks,
    },
    recentVisits: filteredVisits.slice(0, 100),
  }, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}
