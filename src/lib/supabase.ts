import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { LandingConfig, VisitEvent } from "./types";
import { DEFAULT_CONFIG } from "./db";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  return Boolean(url && key);
}

// ==========================================
// CONFIGURAÇÕES (lp_config)
// ==========================================
export async function getSupabaseConfig(): Promise<LandingConfig | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("lp_config")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.error("Erro ao consultar lp_config no Supabase:", error);
      return null;
    }

    if (!data) {
      // Cria a linha 'default' automaticamente se não existir
      await saveSupabaseConfig(DEFAULT_CONFIG);
      return DEFAULT_CONFIG;
    }

    return {
      telegramUrl: data.telegram_url || DEFAULT_CONFIG.telegramUrl,
      forwardUtms: data.forward_utms ?? DEFAULT_CONFIG.forwardUtms,
      photoUrl: data.photo_url || DEFAULT_CONFIG.photoUrl,
      savedPhotos: Array.isArray(data.saved_photos) ? data.saved_photos : [data.photo_url || DEFAULT_CONFIG.photoUrl],
      modelName: data.model_name || DEFAULT_CONFIG.modelName,
      badgeText: data.badge_text || DEFAULT_CONFIG.badgeText,
      showBadge: data.show_badge ?? DEFAULT_CONFIG.showBadge,
      hookHeadline: data.hook_headline || DEFAULT_CONFIG.hookHeadline,
      showHookHeadline: data.show_hook_headline ?? DEFAULT_CONFIG.showHookHeadline,
      urgencyBadge: data.urgency_badge || DEFAULT_CONFIG.urgencyBadge,
      showUrgencyBadge: data.show_urgency_badge ?? DEFAULT_CONFIG.showUrgencyBadge,
      buttonText: data.button_text || DEFAULT_CONFIG.buttonText,
      buttonSubtext: data.button_subtext || "",
      showButtonSubtext: data.show_button_subtext ?? false,
      ctaIcon: data.cta_icon || DEFAULT_CONFIG.ctaIcon,
      themePreset: data.theme_preset || DEFAULT_CONFIG.themePreset,
      buttonBgColor: data.button_bg_color || DEFAULT_CONFIG.buttonBgColor,
      buttonTextColor: data.button_text_color || DEFAULT_CONFIG.buttonTextColor,
      buttonGlow: data.button_glow ?? DEFAULT_CONFIG.buttonGlow,
      overlayStyle: data.overlay_style || DEFAULT_CONFIG.overlayStyle,
      footerDisclaimer: data.footer_disclaimer || DEFAULT_CONFIG.footerDisclaimer,
      showFooterDisclaimer: data.show_footer_disclaimer ?? DEFAULT_CONFIG.showFooterDisclaimer,
      showAdminShortcut: false, // Sempre desativado na LP pública
      adminPassword: data.admin_password || DEFAULT_CONFIG.adminPassword,
      facebookPixelId: data.facebook_pixel_id || "",
      googleAnalyticsId: data.google_analytics_id || "",
      tiktokPixelId: data.tiktok_pixel_id || "",
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error("Erro ao buscar config no Supabase:", err);
    return null;
  }
}

export async function saveSupabaseConfig(config: Partial<LandingConfig>): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const payload: Record<string, any> = {
      id: "default",
      updated_at: new Date().toISOString(),
    };

    if (config.telegramUrl !== undefined) payload.telegram_url = config.telegramUrl;
    if (config.forwardUtms !== undefined) payload.forward_utms = config.forwardUtms;
    if (config.photoUrl !== undefined) payload.photo_url = config.photoUrl;
    if (config.savedPhotos !== undefined) payload.saved_photos = config.savedPhotos;
    if (config.modelName !== undefined) payload.model_name = config.modelName;
    if (config.badgeText !== undefined) payload.badge_text = config.badgeText;
    if (config.showBadge !== undefined) payload.show_badge = config.showBadge;
    if (config.hookHeadline !== undefined) payload.hook_headline = config.hookHeadline;
    if (config.showHookHeadline !== undefined) payload.show_hook_headline = config.showHookHeadline;
    if (config.urgencyBadge !== undefined) payload.urgency_badge = config.urgencyBadge;
    if (config.showUrgencyBadge !== undefined) payload.show_urgency_badge = config.showUrgencyBadge;
    if (config.buttonText !== undefined) payload.button_text = config.buttonText;
    if (config.buttonSubtext !== undefined) payload.button_subtext = config.buttonSubtext;
    if (config.showButtonSubtext !== undefined) payload.show_button_subtext = config.showButtonSubtext;
    if (config.ctaIcon !== undefined) payload.cta_icon = config.ctaIcon;
    if (config.themePreset !== undefined) payload.theme_preset = config.themePreset;
    if (config.buttonBgColor !== undefined) payload.button_bg_color = config.buttonBgColor;
    if (config.buttonTextColor !== undefined) payload.button_text_color = config.buttonTextColor;
    if (config.buttonGlow !== undefined) payload.button_glow = config.buttonGlow;
    if (config.overlayStyle !== undefined) payload.overlay_style = config.overlayStyle;
    if (config.footerDisclaimer !== undefined) payload.footer_disclaimer = config.footerDisclaimer;
    if (config.showFooterDisclaimer !== undefined) payload.show_footer_disclaimer = config.showFooterDisclaimer;
    if (config.adminPassword !== undefined) payload.admin_password = config.adminPassword;
    if (config.facebookPixelId !== undefined) payload.facebook_pixel_id = config.facebookPixelId;
    if (config.googleAnalyticsId !== undefined) payload.google_analytics_id = config.googleAnalyticsId;
    if (config.tiktokPixelId !== undefined) payload.tiktok_pixel_id = config.tiktokPixelId;

    const { error } = await supabase
      .from("lp_config")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Erro ao fazer upsert em lp_config:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao gravar config no Supabase:", err);
    return false;
  }
}

// ==========================================
// VISITAS & RASTREAMENTO REAL (lp_visits)
// ==========================================
export async function insertSupabaseVisit(visit: Omit<VisitEvent, "clicked" | "clickedAt">): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("lp_visits").insert({
      id: visit.id,
      timestamp: visit.timestamp,
      ip: visit.ip,
      country: visit.country,
      country_code: visit.countryCode,
      region: visit.region,
      city: visit.city,
      device: visit.device,
      os: visit.os,
      browser: visit.browser,
      is_in_app: visit.isInAppBrowser,
      in_app_name: visit.inAppName,
      user_agent: visit.userAgent,
      referrer: visit.referrer,
      utm_source: visit.utm_source || "direto",
      utm_medium: visit.utm_medium || "nenhum",
      utm_campaign: visit.utm_campaign || "geral",
      utm_content: visit.utm_content || "",
      utm_term: visit.utm_term || "",
      extra_params: visit.extraParams || {},
      clicked: false,
    });

    if (error) {
      console.error("Erro insertSupabaseVisit:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao inserir visita no Supabase:", err);
    return false;
  }
}

export async function updateSupabaseClick(visitId?: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const now = new Date().toISOString();

  try {
    if (visitId) {
      const { error } = await supabase
        .from("lp_visits")
        .update({ clicked: true, clicked_at: now })
        .eq("id", visitId);

      if (!error) return true;
    }

    // Se não tiver visitId ou não achar, marca a visita mais recente
    const { data: latest } = await supabase
      .from("lp_visits")
      .select("id")
      .eq("clicked", false)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.id) {
      const { error } = await supabase
        .from("lp_visits")
        .update({ clicked: true, clicked_at: now })
        .eq("id", latest.id);
      return !error;
    }

    return false;
  } catch (err) {
    console.error("Erro ao registrar clique no Supabase:", err);
    return false;
  }
}

export async function getSupabaseVisits(): Promise<VisitEvent[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("lp_visits")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("Erro getSupabaseVisits:", error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      ip: row.ip || "",
      country: row.country || "Brasil",
      countryCode: row.country_code || "BR",
      region: row.region || "",
      city: row.city || "",
      device: (row.device as any) || "Mobile",
      os: row.os || "Desconhecido",
      browser: row.browser || "Desconhecido",
      isInAppBrowser: Boolean(row.is_in_app),
      inAppName: row.in_app_name,
      userAgent: row.user_agent || "",
      referrer: row.referrer || "",
      utm_source: row.utm_source || "direto",
      utm_medium: row.utm_medium || "nenhum",
      utm_campaign: row.utm_campaign || "geral",
      utm_content: row.utm_content || "",
      utm_term: row.utm_term || "",
      extraParams: row.extra_params || {},
      clicked: Boolean(row.clicked),
      clickedAt: row.clicked_at,
    }));
  } catch (err) {
    console.error("Erro ao buscar visitas no Supabase:", err);
    return [];
  }
}

export async function resetSupabaseVisits(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    // Deleta com filtro universal para limpar todas as linhas de visitas
    const { error } = await supabase
      .from("lp_visits")
      .delete()
      .gte("timestamp", "1970-01-01T00:00:00Z");

    if (error) {
      // Fallback
      const { error: err2 } = await supabase
        .from("lp_visits")
        .delete()
        .neq("id", "___none___");
      return !err2;
    }

    return true;
  } catch (err) {
    console.error("Erro resetSupabaseVisits:", err);
    return false;
  }
}

// ==========================================
// SUPABASE STORAGE (Fotos da Modelo)
// ==========================================
export async function uploadToSupabaseStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const bucket = "marcinha-media";
    const cleanFilename = `model-${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(cleanFilename, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Erro no upload para o bucket Supabase:", uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(cleanFilename);

    return publicData.publicUrl;
  } catch (err) {
    console.error("Falha ao salvar no storage do Supabase:", err);
    return null;
  }
}
