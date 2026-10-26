"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Script from "next/script";
import {
  Send,
  ShieldCheck,
  ExternalLink,
  Flame,
  Lock,
  Heart,
  Zap,
  Star,
  Users,
} from "lucide-react";
import type { LandingConfig } from "@/lib/types";

export default function MobileLandingPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [visitId, setVisitId] = useState<string>("");
  const [isRedirecting, setIsRedirecting] = useState(false);

  // 1. Carrega configuração da LP
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    }
    loadConfig();
  }, []);

  // 2. Registra visita com parâmetros UTM e informações de dispositivo
  useEffect(() => {
    async function registerVisit() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const utm_source = searchParams.get("utm_source") || "";
        const utm_medium = searchParams.get("utm_medium") || "";
        const utm_campaign = searchParams.get("utm_campaign") || "";
        const utm_content = searchParams.get("utm_content") || "";
        const utm_term = searchParams.get("utm_term") || "";

        const extraParams: Record<string, string> = {};
        searchParams.forEach((val, key) => {
          if (!key.startsWith("utm_")) {
            extraParams[key] = val;
          }
        });

        const generatedVisitId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        setVisitId(generatedVisitId);

        await fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitId: generatedVisitId,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
            referrer: document.referrer,
            extraParams,
          }),
        });
      } catch (err) {
        console.error("Erro ao registrar visita:", err);
      }
    }

    registerVisit();
  }, []);

  // 3. Clique no botão de conversão
  const handleCtaClick = () => {
    if (isRedirecting) return;
    setIsRedirecting(true);

    // Dispara eventos de Pixel se configurados
    try {
      if (typeof window !== "undefined") {
        // @ts-ignore
        if (window.fbq) {
          // @ts-ignore
          window.fbq("track", "Lead");
        }
        // @ts-ignore
        if (window.ttq) {
          // @ts-ignore
          window.ttq.track("ClickButton");
        }
      }
    } catch {}

    // Registra clique no servidor
    try {
      const payload = JSON.stringify({ visitId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track/click", payload);
      } else {
        fetch("/api/track/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch (e) {
      console.error("Erro ao registrar clique:", e);
    }

    // Repasse de UTMs para o Telegram
    let destination = config?.telegramUrl || "https://t.me/MarcinhaVip18_bot";

    if (config?.forwardUtms && window.location.search) {
      const currentParams = new URLSearchParams(window.location.search);
      try {
        const destUrl = new URL(destination);
        currentParams.forEach((value, key) => {
          destUrl.searchParams.set(key, value);
        });
        destination = destUrl.toString();
      } catch {
        const sep = destination.includes("?") ? "&" : "?";
        destination = `${destination}${sep}${currentParams.toString()}`;
      }
    }

    // Redirecionamento instantâneo
    window.location.href = destination;
  };

  const photo = config?.photoUrl || "/uploads/model-default.jpg";
  const buttonText = config?.buttonText || "Acessar agora";
  const badgeText = config?.badgeText || "Online agora • VIP";
  const showBadge = config?.showBadge !== false;
  const buttonSubtext = config?.buttonSubtext || "";
  const showButtonSubtext = config?.showButtonSubtext || false;
  const buttonBg = config?.buttonBgColor || "#229ED9";
  const buttonTextColor = config?.buttonTextColor || "#ffffff";
  const buttonGlow = config?.buttonGlow !== false;
  const ctaIcon = config?.ctaIcon || "telegram";
  const overlayStyle = config?.overlayStyle || "cinematic";
  const footerDisclaimer = config?.footerDisclaimer || "Acesso direto e verificado • +18";
  const showFooterDisclaimer = config?.showFooterDisclaimer !== false;

  // Renderizador do ícone dinâmico do CTA
  const renderCtaIcon = () => {
    switch (ctaIcon) {
      case "fire":
        return <Flame className="w-5 h-5 text-amber-300 fill-amber-400 shrink-0" />;
      case "lock":
        return <Lock className="w-5 h-5 text-white shrink-0" />;
      case "heart":
        return <Heart className="w-5 h-5 text-rose-300 fill-rose-400 shrink-0" />;
      case "bolt":
        return <Zap className="w-5 h-5 text-amber-300 fill-amber-300 shrink-0" />;
      case "star":
        return <Star className="w-5 h-5 text-amber-300 fill-amber-300 shrink-0" />;
      case "telegram":
      default:
        return <Send className="w-5 h-5 text-white fill-white/80 shrink-0" />;
    }
  };

  return (
    <>
      {/* Facebook Pixel */}
      {config?.facebookPixelId && (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${config.facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {/* TikTok Pixel */}
      {config?.tiktokPixelId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndDefer(ttq,ttq.methods[e]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
              ttq.load('${config.tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      <main className="relative w-full min-h-dvh flex items-center justify-center bg-zinc-950 overflow-hidden">
        {/* Container Mobile Otimizado (max-w-md no desktop, 100% no smartphone) */}
        <div className="relative w-full max-w-md h-dvh flex flex-col justify-between overflow-hidden shadow-2xl bg-black">
          
          {/* Imagem de Fundo da Modelo */}
          <div className="absolute inset-0 w-full h-full">
            <Image
              src={photo}
              alt="Modelo VIP"
              fill
              priority
              sizes="(max-width: 768px) 100vw, 450px"
              className="object-cover object-top select-none pointer-events-none"
            />
            
            {/* Efeitos de Degradê e Vinheta Customizáveis */}
            {overlayStyle === "heavy" ? (
              <>
                <div className="absolute inset-0 bg-black/45 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none" />
              </>
            ) : overlayStyle === "clean" ? (
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/30 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none" />
              </>
            )}
          </div>

          {/* Topo: Badges de Status, Prova Social e Hook de Conversão */}
          <header
            className="relative z-10 pt-4 px-4 flex flex-col gap-2.5"
            style={{ paddingTop: "calc(var(--safe-top) + 1rem)" }}
          >
            <div className="flex items-center justify-between gap-2">
              {showBadge && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-xl animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  <span>{badgeText}</span>
                </div>
              )}

              {config?.showUrgencyBadge && config?.urgencyBadge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-[11px] font-bold text-amber-300 shadow-xl">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>{config.urgencyBadge}</span>
                </div>
              )}
            </div>

            {/* Hook / Copy Principal Superior Opcional */}
            {config?.showHookHeadline && config?.hookHeadline && (
              <div className="w-full bg-black/65 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-2xl text-center animate-fade-in">
                <p className="text-xs sm:text-sm font-black text-white leading-snug drop-shadow-md">
                  {config.hookHeadline}
                </p>
              </div>
            )}
          </header>

          {/* Rodapé: Botão de Conversão, Subtítulo e Selo */}
          <footer
            className="relative z-10 w-full px-5 pb-6 flex flex-col items-center gap-3"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 1.5rem)" }}
          >
            {/* Botão de Alta Conversão com Ícone Customizado */}
            <button
              onClick={handleCtaClick}
              disabled={isRedirecting}
              style={{
                backgroundColor: buttonBg,
                color: buttonTextColor,
              }}
              className={`
                relative w-full py-4 px-6 rounded-2xl font-bold text-lg tracking-wide
                flex items-center justify-center gap-3
                transition-all duration-150 ease-out
                active:scale-[0.97] active:opacity-95
                border border-white/20
                cursor-pointer select-none
                ${buttonGlow ? "animate-cta-pulse" : "shadow-xl"}
              `}
            >
              {/* Efeito de brilho que cruza o botão continuamente */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="w-full h-full shimmer-effect opacity-60" />
              </div>

              {/* Ícone dinâmico */}
              {renderCtaIcon()}

              <span className="relative z-10 drop-shadow-sm font-semibold truncate">
                {isRedirecting ? "Abrindo..." : buttonText}
              </span>

              {/* Seta discreta */}
              <ExternalLink className="w-4 h-4 opacity-75 shrink-0 ml-auto" />
            </button>

            {/* Subtítulo do botão opcional */}
            {showButtonSubtext && buttonSubtext && (
              <p className="text-xs text-zinc-300 font-medium text-center drop-shadow">
                {buttonSubtext}
              </p>
            )}

            {/* Selo de segurança / Disclaimer configurável */}
            {showFooterDisclaimer && (
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-normal">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{footerDisclaimer}</span>
              </div>
            )}
          </footer>
        </div>
      </main>
    </>
  );
}
