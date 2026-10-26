import { NextRequest, NextResponse } from "next/server";
import { recordVisitAsync } from "@/lib/db";
import { lookupGeo } from "@/lib/geo";
import { parseUserAgent } from "@/lib/ua";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Extração do IP
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const ip = (forwarded ? forwarded.split(",")[0].trim() : realIp) || "127.0.0.1";

    // 2. Extração de User-Agent
    const userAgent = req.headers.get("user-agent") || body.userAgent || "";
    const uaInfo = parseUserAgent(userAgent);

    // 3. Geolocalização
    const geo = await lookupGeo(ip, req.headers);

    // 4. UTMs e referrers
    const utm_source = (body.utm_source || "").toLowerCase().trim();
    const utm_medium = (body.utm_medium || "").toLowerCase().trim();
    const utm_campaign = (body.utm_campaign || "").trim();
    const utm_content = (body.utm_content || "").trim();
    const utm_term = (body.utm_term || "").trim();
    const referrer = body.referrer || req.headers.get("referer") || "";

    const visitId = body.visitId || `vis_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const visit = await recordVisitAsync({
      id: visitId,
      timestamp: new Date().toISOString(),
      ip,
      country: geo.country,
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      device: uaInfo.device,
      os: uaInfo.os,
      browser: uaInfo.browser,
      isInAppBrowser: uaInfo.isInAppBrowser,
      inAppName: uaInfo.inAppName,
      userAgent,
      referrer,
      utm_source: utm_source || "direto",
      utm_medium: utm_medium || "nenhum",
      utm_campaign: utm_campaign || "geral",
      utm_content,
      utm_term,
      extraParams: body.extraParams || {},
    });

    return NextResponse.json({
      success: true,
      visitId: visit.id,
    });
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    return NextResponse.json({ success: false, error: "Falha ao gravar visita" }, { status: 500 });
  }
}
