"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Users,
  MousePointerClick,
  TrendingUp,
  Smartphone,
  Globe,
  Clock,
  Sparkles,
  Save,
  Upload,
  RefreshCw,
  ExternalLink,
  Shield,
  Palette,
  Sliders,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  LogOut,
  Send,
  Eye,
  Database,
  Link as LinkIcon,
  Copy,
  DollarSign,
  Activity,
  MapPin,
  Flame,
  Zap,
  Heart,
  Star,
  Trash2,
  Search,
  Check,
  CheckCheck,
  Code,
  QrCode,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import type { LandingConfig, VisitEvent, OrderEvent, OrdersSummary } from "@/lib/types";
import BrazilMap from "@/components/BrazilMap";

interface StatsData {
  period: string;
  totalVisits: number;
  uniqueVisits: number;
  totalClicks: number;
  conversionRate: number;
  topSources: Array<{ source: string; visits: number; clicks: number; cr: string }>;
  topCampaigns: Array<{ campaign: string; visits: number; clicks: number; cr: string }>;
  devices: Record<string, number>;
  os: Record<string, number>;
  browsers: Record<string, number>;
  topLocations: Array<{ location: string; count: number }>;
  brazilStateMap?: Record<string, { visits: number; clicks: number }>;
  brazilStates?: Array<{ uf: string; name: string; visits: number; clicks: number; cr: number }>;
  hourly: {
    labels: string[];
    visits: number[];
    clicks: number[];
  };
  recentVisits: VisitEvent[];
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [adminToken, setAdminToken] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"stats" | "sales" | "feed" | "generator" | "editor" | "settings">("stats");
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("today");

  // Vendas & Webhook Firebot
  const [ordersData, setOrdersData] = useState<OrdersSummary | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState<string>("");
  const [selectedPayload, setSelectedPayload] = useState<Record<string, any> | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Configuração atual da LP
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Estatísticas
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Filtros do Feed de Visitantes
  const [searchLog, setSearchLog] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "clicked" | "viewed">("all");
  const [selectedUf, setSelectedUf] = useState<string>("");

  // Auto-refresh (Tempo Real)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Upload
  const [uploading, setUploading] = useState(false);

  // Status Supabase
  const [supabaseStatus, setSupabaseStatus] = useState<{
    connected: boolean;
    visitsCount?: number;
    url?: string;
    message?: string;
    error?: string;
  } | null>(null);

  // Calculadora de ROI
  const [ticketPrice, setTicketPrice] = useState<number>(29.9);
  const [conversionToSaleRate, setConversionToSaleRate] = useState<number>(5.0);

  // Gerador de Links UTM
  const [generatorChannel, setGeneratorChannel] = useState("tiktok_ads");
  const [generatorCampaign, setGeneratorCampaign] = useState("campanha_vip_01");
  const [generatorCreative, setGeneratorCreative] = useState("criativo_01");
  const [generatedUrl, setGeneratedUrl] = useState("");

  // 1. Checa autenticação no localStorage e Cookies
  useEffect(() => {
    const savedToken = localStorage.getItem("marcinha_admin_token");
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    } else {
      const match = document.cookie.match(new RegExp("(^| )marcinha_admin_session=([^;]+)"));
      if (match && match[2]) {
        setAdminToken(match[2]);
        localStorage.setItem("marcinha_admin_token", match[2]);
        setIsAuthenticated(true);
      }
    }
  }, []);

  // 2. Carrega dados quando autenticado
  useEffect(() => {
    if (!isAuthenticated || !adminToken) return;

    fetchConfig();
    fetchStats();
    fetchOrders();
    fetchSupabaseStatus();
  }, [isAuthenticated, adminToken, period]);

  // 3. Auto-Refresh em Tempo Real
  useEffect(() => {
    if (!isAuthenticated || !adminToken || autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchStats(true);
      fetchOrders(true);
      setLastRefreshedAt(new Date());
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, adminToken, autoRefreshInterval, period]);

  // 4. Atualiza URL gerada do gerador de UTMs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const baseUrl = window.location.origin;
      const params = new URLSearchParams();
      if (generatorChannel) params.set("utm_source", generatorChannel);
      if (generatorChannel.includes("ads")) params.set("utm_medium", "cpc");
      else params.set("utm_medium", "social");
      if (generatorCampaign) params.set("utm_campaign", generatorCampaign);
      if (generatorCreative) params.set("utm_content", generatorCreative);

      setGeneratedUrl(`${baseUrl}/?${params.toString()}`);
    }
  }, [generatorChannel, generatorCampaign, generatorCreative]);

  const fetchSupabaseStatus = async () => {
    try {
      const res = await fetch("/api/admin/supabase-status", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch {}
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/config", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    }
  };

  const fetchStats = async (isSilent = false) => {
    if (!isSilent) setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      if (!isSilent) toast.error("Falha ao atualizar estatísticas");
    } finally {
      if (!isSilent) setLoadingStats(false);
    }
  };

  const fetchOrders = async (isSilent = false) => {
    if (!isSilent) setLoadingOrders(true);
    try {
      const res = await fetch(`/api/admin/orders?period=${period}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrdersData(data);
      }
    } catch (err) {
      if (!isSilent) toast.error("Falha ao carregar vendas do FireBot");
    } finally {
      if (!isSilent) setLoadingOrders(false);
    }
  };

  const handleSimulateOrder = async (type: "created" | "paid") => {
    setSimulating(true);
    try {
      const res = await fetch("/api/admin/orders/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          type,
          amount: ticketPrice || 29.9,
          utm_source: "tiktok_ads",
          utm_campaign: "campanha_vip_01",
          username: `lead_${Math.floor(1000 + Math.random() * 9000)}`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Simulação executada!");
        fetchOrders();
      } else {
        toast.error(data.error || "Erro na simulação");
      }
    } catch {
      toast.error("Falha de rede ao simular");
    } finally {
      setSimulating(false);
    }
  };

  const handleResetOrders = async () => {
    if (!confirm("Tem certeza que deseja zerar TODAS as vendas e eventos de webhook registrados?")) {
      return;
    }
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        toast.success("Histórico de vendas zerado!");
        fetchOrders();
      } else {
        toast.error("Falha ao zerar vendas");
      }
    } catch {
      toast.error("Erro ao conectar");
    }
  };

  const handleCopyWebhookUrl = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/api/webhooks/firebot`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success("URL do Webhook copiada para a área de transferência!");
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAdminToken(data.token);
        localStorage.setItem("marcinha_admin_token", data.token);
        document.cookie = `marcinha_admin_session=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
        setIsAuthenticated(true);
        toast.success("Autenticado com sucesso!");
      } else {
        toast.error("Senha incorreta!");
      }
    } catch {
      toast.error("Erro ao validar login");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("marcinha_admin_token");
    document.cookie = "marcinha_admin_session=; path=/; max-age=0";
    setAdminToken("");
    setIsAuthenticated(false);
    toast.info("Você saiu do painel.");
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast.success("Configurações salvas e aplicadas!");
        fetchSupabaseStatus();
      } else {
        toast.error("Falha ao salvar configurações");
      }
    } catch {
      toast.error("Erro de conexão ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.url) {
        setConfig((prev) => {
          if (!prev) return null;
          const currentPhotos = prev.savedPhotos || [];
          const updatedPhotos = currentPhotos.includes(data.url)
            ? currentPhotos
            : [data.url, ...currentPhotos];

          return {
            ...prev,
            photoUrl: data.url,
            savedPhotos: updatedPhotos,
          };
        });

        toast.success(
          data.storage === "supabase"
            ? "Foto enviada direto para o Supabase Storage com sucesso!"
            : "Foto enviada com sucesso!"
        );
      } else {
        toast.error(data.error || "Erro no upload");
      }
    } catch {
      toast.error("Falha ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirm("Tem certeza que deseja zerar TODAS as estatísticas de visitas e cliques?")) {
      return;
    }

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        toast.success("Estatísticas limpas com sucesso!");
        fetchStats();
        fetchSupabaseStatus();
      }
    } catch {
      toast.error("Erro ao zerar dados");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const exportCSV = () => {
    if (!stats?.recentVisits?.length) {
      toast.error("Sem dados para exportar");
      return;
    }

    const headers = [
      "Data/Hora",
      "IP",
      "Dispositivo",
      "SO",
      "Navegador",
      "In-App",
      "Cidade",
      "UF",
      "País",
      "UTM Source",
      "UTM Medium",
      "UTM Campaign",
      "UTM Content",
      "Clicou Telegram",
      "Hora Clique",
      "Referrer",
    ];

    const rows = stats.recentVisits.map((v) => [
      new Date(v.timestamp).toLocaleString("pt-BR"),
      v.ip,
      v.device,
      v.os,
      v.browser,
      v.isInAppBrowser ? `Sim (${v.inAppName || v.browser})` : "Não",
      v.city,
      v.region,
      v.country,
      v.utm_source,
      v.utm_medium,
      v.utm_campaign,
      v.utm_content || "",
      v.clicked ? "SIM" : "NAO",
      v.clickedAt ? new Date(v.clickedAt).toLocaleString("pt-BR") : "",
      v.referrer || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `marcinha_leads_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Relatório CSV exportado!");
  };

  // Cores pré-definidas com gradientes
  const colorPresets = [
    { name: "Telegram Oficial", bg: "#229ED9", text: "#ffffff" },
    { name: "Rosa Sexy Neon", bg: "#ec4899", text: "#ffffff" },
    { name: "Vermelho Hot", bg: "#f43f5e", text: "#ffffff" },
    { name: "Verde Emerald", bg: "#10b981", text: "#ffffff" },
    { name: "Dourado VIP", bg: "#f59e0b", text: "#000000" },
    { name: "Roxo Cyber", bg: "#8b5cf6", text: "#ffffff" },
    { name: "Dark Luxury", bg: "#18181b", text: "#ffffff" },
  ];

  // Presets de Hooks de Teste
  const hookPresets = [
    "Ela está te esperando no Telegram... 🔞",
    "Você foi convidado para o VIP Oficial ✨",
    "Apenas hoje: acesso liberado com prévia exclusiva 🔥",
    "Acesso direto ao chat privado com fotos diárias 🟢",
  ];

  // Presets de Botão CTA
  const ctaPresets = [
    "Acessar agora",
    "Quero entrar no VIP 🔥",
    "Ver fotos exclusivas 🔞",
    "Conversar com ela no Telegram 💬",
    "Acessar canal VIP grátis 🎁",
  ];

  // Filtra logs de visitas com busca e tags
  const filteredLogs = stats?.recentVisits?.filter((v) => {
    if (statusFilter === "clicked" && !v.clicked) return false;
    if (statusFilter === "viewed" && v.clicked) return false;
    if (selectedUf && v.region !== selectedUf) return false;

    if (!searchLog) return true;
    const term = searchLog.toLowerCase();
    return (
      v.utm_source.toLowerCase().includes(term) ||
      v.utm_campaign.toLowerCase().includes(term) ||
      (v.utm_content && v.utm_content.toLowerCase().includes(term)) ||
      v.city.toLowerCase().includes(term) ||
      v.region.toLowerCase().includes(term) ||
      v.device.toLowerCase().includes(term) ||
      v.browser.toLowerCase().includes(term) ||
      v.ip.includes(term)
    );
  });

  // Filtra lista de pedidos / webhook Firebot
  const filteredOrdersList = ordersData?.recentOrders?.filter((o) => {
    if (orderStatusFilter !== "all" && o.status !== orderStatusFilter) return false;
    if (!orderSearch) return true;
    const term = orderSearch.toLowerCase();
    return (
      o.id.toLowerCase().includes(term) ||
      (o.customerName && o.customerName.toLowerCase().includes(term)) ||
      (o.telegramUsername && o.telegramUsername.toLowerCase().includes(term)) ||
      (o.telegramId && o.telegramId.toLowerCase().includes(term)) ||
      (o.utm_source && o.utm_source.toLowerCase().includes(term)) ||
      (o.utm_campaign && o.utm_campaign.toLowerCase().includes(term)) ||
      (o.productName && o.productName.toLowerCase().includes(term))
    );
  }) || [];

  // Estimativa de faturamento
  const totalClicksCount = stats?.totalClicks || 0;
  const estimatedSales = Math.round(totalClicksCount * (conversionToSaleRate / 100));
  const estimatedRevenue = (estimatedSales * ticketPrice).toFixed(2);

  // TELA DE LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Painel Administrativo</h1>
            <p className="text-xs text-zinc-400 mt-1">Marcinha VIP • Analytics & Gestão de Tráfego</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Digite a senha mestre..."
                required
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
              />
              <p className="text-[11px] text-zinc-500 mt-2">
                Sua sessão ficará salva neste navegador por 30 dias.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98] cursor-pointer"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-500/20">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight">Marcinha VIP</h1>
              {supabaseStatus?.connected ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Supabase Ativo
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Modo Local
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">Controle de Conversão, Testes de Copy & Mídia</p>
          </div>
        </div>

        {/* Controles de Atualização & Ações */}
        <div className="flex items-center gap-2">
          {/* Indicador de Auto-refresh */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 text-[11px]">Ao Vivo:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value={10} className="bg-zinc-900">10s</option>
              <option value={15} className="bg-zinc-900">15s</option>
              <option value={30} className="bg-zinc-900">30s</option>
              <option value={0} className="bg-zinc-900">Desligado</option>
            </select>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors shadow-sm"
          >
            <span>Ver Página</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <button
            onClick={() => {
              fetchStats();
              fetchOrders();
            }}
            title="Atualizar dados agora"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats || loadingOrders ? "animate-spin text-blue-400" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Sair do painel"
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navegação por Abas */}
      <nav className="bg-zinc-900/60 border-b border-zinc-800 px-4 lg:px-8 flex gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("stats")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "stats"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Métricas & Mapa Brasil
        </button>

        <button
          onClick={() => setActiveTab("sales")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "sales"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Vendas & FireBot (PIX)
          {ordersData && ordersData.paidOrders > 0 ? (
            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-mono font-bold">
              R$ {ordersData.totalRevenue.toFixed(0)}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("editor")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "editor"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Palette className="w-4 h-4" />
          Editor de Copys, Hooks & Fotos
        </button>

        <button
          onClick={() => setActiveTab("feed")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "feed"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          Feed de Visitantes & Clicks
          {stats?.recentVisits?.length ? (
            <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-400 rounded-full font-mono">
              {stats.recentVisits.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("generator")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "generator"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          Gerador de Links UTM
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "settings"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Pixels & Supabase
        </button>
      </nav>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
        {/* ================= ABA 1: MÉTRICAS & MAPA BRASIL ================= */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Barra de Filtro de Período & Ações */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-bold text-zinc-300">Período:</span>
                <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  {(["today", "7d", "30d", "all"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        period === p ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {p === "today" ? "Hoje" : p === "7d" ? "7 Dias" : p === "30d" ? "30 Dias" : "Todos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-400">
                <span>Última atualização: {lastRefreshedAt.toLocaleTimeString("pt-BR")}</span>
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* 4 Cards de Métricas Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Acessos Totais</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {stats?.totalVisits ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {stats?.uniqueVisits ?? 0} visitantes únicos (IP)
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Cliques no Botão</span>
                  <MousePointerClick className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-black text-emerald-400">
                  {stats?.totalClicks ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Redirecionados para o Telegram</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Taxa de Conversão</span>
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-black text-purple-400">
                  {stats?.conversionRate ?? 0}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Cliques / Visitas (CTR Real)</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Tráfego Mobile</span>
                  <Smartphone className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-black text-white">
                  {stats?.devices?.["Mobile"]
                    ? Math.round(((stats.devices["Mobile"] || 0) / (stats.totalVisits || 1)) * 100)
                    : 100}
                  %
                </div>
                <p className="text-xs text-zinc-500 mt-1">Usuários em Smartphones</p>
              </div>
            </div>

            {/* SEÇÃO: MAPA VISUAL DO BRASIL DE ACESSOS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Mapa do Brasil: Onde Estão Seus Acessos & Conversões
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Visualização interativa por estado. Clique no estado para filtrar o feed de visitantes.
                  </p>
                </div>

                {selectedUf && (
                  <button
                    onClick={() => {
                      setSelectedUf("");
                      setSearchLog("");
                    }}
                    className="px-3 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700 transition-colors"
                  >
                    Limpar Filtro ({selectedUf}) ✕
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
                {/* Mapa SVG */}
                <div className="lg:col-span-7 flex justify-center">
                  <BrazilMap
                    stateData={stats?.brazilStateMap || {}}
                    onSelectState={(uf) => {
                      const next = uf === selectedUf ? "" : uf;
                      setSelectedUf(next);
                      setSearchLog(next);
                    }}
                    selectedUf={selectedUf}
                  />
                </div>

                {/* Ranking de Estados */}
                <div className="lg:col-span-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <span>🏆 Ranking de Estados</span>
                    <span className="text-[10px] text-zinc-500 font-normal">(Mais Acessados)</span>
                  </h4>

                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {stats?.brazilStates?.length ? (
                      stats.brazilStates.map((st, i) => {
                        const maxV = stats.totalVisits || 1;
                        const pct = Math.round((st.visits / maxV) * 100);
                        const isSelected = selectedUf === st.uf;

                        return (
                          <div
                            key={st.uf}
                            onClick={() => {
                              const next = isSelected ? "" : st.uf;
                              setSelectedUf(next);
                              setSearchLog(next);
                            }}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20"
                                : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <div className="flex items-center gap-2 font-bold text-white">
                                <span className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] flex items-center justify-center font-mono text-zinc-400">
                                  {i + 1}
                                </span>
                                <span>{st.name} ({st.uf})</span>
                              </div>
                              <div className="flex items-center gap-3 font-mono text-[11px]">
                                <span className="text-zinc-300"><b>{st.visits}</b> visitas</span>
                                <span className="text-emerald-400 font-bold"><b>{st.clicks}</b> cliques</span>
                                <span className="text-purple-400 font-black">{st.cr}% CR</span>
                              </div>
                            </div>

                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                                style={{ width: `${Math.max(pct, 5)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-zinc-500 py-10 text-center">
                        Nenhum dado de estado registrado ainda no período.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Calculadora de Potencial de Receita VIP */}
            <div className="bg-gradient-to-r from-blue-950/30 via-indigo-950/30 to-purple-950/30 border border-blue-900/40 rounded-3xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Projeção de Faturamento Estimado (Canal VIP)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Estime o faturamento gerado com base nos leads redirecionados para o Telegram
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <span>Ticket VIP (R$):</span>
                    <input
                      type="number"
                      step="0.10"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(Number(e.target.value))}
                      className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-xs text-right"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <span>Conversão no Bot (%):</span>
                    <input
                      type="number"
                      step="0.5"
                      value={conversionToSaleRate}
                      onChange={(e) => setConversionToSaleRate(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400">Total de Leads Enviados:</span>
                  <div className="text-xl font-extrabold text-blue-400 mt-1">{totalClicksCount} cliques</div>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400">Vendas Estimadas ({conversionToSaleRate}%):</span>
                  <div className="text-xl font-extrabold text-purple-400 mt-1">{estimatedSales} assinantes</div>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
                  <span className="text-[11px] text-zinc-400">Faturamento Bruto Projetado:</span>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">R$ {estimatedRevenue}</div>
                </div>
              </div>
            </div>

            {/* Grids de Tráfego: UTMs e Horários */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabela de UTM Sources */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Origens de Tráfego (UTM Source)
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    {stats?.topSources?.length || 0} canais
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-semibold">Canal</th>
                        <th className="pb-2 font-semibold text-right">Acessos</th>
                        <th className="pb-2 font-semibold text-right">Cliques</th>
                        <th className="pb-2 font-semibold text-right">Taxa (CR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {stats?.topSources?.length ? (
                        stats.topSources.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/30">
                            <td className="py-3 font-semibold text-zinc-200 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="capitalize">{item.source}</span>
                            </td>
                            <td className="py-3 text-right text-zinc-300 font-mono">{item.visits}</td>
                            <td className="py-3 text-right text-emerald-400 font-bold font-mono">{item.clicks}</td>
                            <td className="py-3 text-right text-purple-400 font-black font-mono">{item.cr}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            Nenhum tráfego registrado no período
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navegadores & In-App */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-pink-400" />
                    Navegadores & In-App (Origem do Usuário)
                  </h3>
                </div>

                <div className="space-y-3">
                  {stats?.browsers && Object.keys(stats.browsers).length > 0 ? (
                    Object.entries(stats.browsers).map(([browser, count], idx) => {
                      const pct = Math.round((count / (stats.totalVisits || 1)) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-zinc-300">{browser}</span>
                            <span className="text-zinc-400 font-mono">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-500 py-6 text-center">Nenhum dado de navegador registrado</p>
                  )}
                </div>

                {/* Top Cidades */}
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5">
                    Top Cidades com Mais Visitas
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stats?.topLocations?.length ? (
                      stats.topLocations.map((loc, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-xl bg-zinc-800/80 border border-zinc-700/80 text-xs text-zinc-300"
                        >
                          📍 {loc.location} <b className="text-blue-400 ml-1">({loc.count})</b>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-zinc-500">Aguardando visitantes...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico 24 Horas */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Distribuição de Tráfego por Horário do Dia (Picos de Conversão)
                </h3>
              </div>

              <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 px-2 overflow-x-auto">
                {stats?.hourly ? (
                  stats.hourly.labels.map((hour, idx) => {
                    const visitsCount = stats.hourly.visits[idx] || 0;
                    const clicksCount = stats.hourly.clicks[idx] || 0;
                    const maxCount = Math.max(...stats.hourly.visits, 1);
                    const heightPct = Math.round((visitsCount / maxCount) * 100);

                    return (
                      <div key={idx} className="flex-1 min-w-[20px] flex flex-col items-center gap-1.5 group relative">
                        <div className="absolute -top-12 bg-black/90 px-2.5 py-1 rounded-lg border border-zinc-700 text-[10px] text-zinc-200 hidden group-hover:flex flex-col items-center z-30 whitespace-nowrap shadow-xl">
                          <span>{hour}</span>
                          <span className="font-bold text-blue-400">{visitsCount} visitas</span>
                          <span className="font-bold text-emerald-400">{clicksCount} cliques</span>
                        </div>

                        <div className="w-full bg-zinc-800 rounded-t-md h-32 flex items-end overflow-hidden">
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md transition-all duration-300"
                            style={{ height: `${Math.max(heightPct, visitsCount > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">{hour}</span>
                      </div>
                    );
                  })
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA DE VENDAS & WEBHOOK (FIREBOT / PIX) ================= */}
        {activeTab === "sales" && (
          <div className="space-y-8">
            {/* 1. Integração & URL do Webhook Firebot */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 border border-emerald-500/20 rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">
                      Webhook FireBot • PIX Gerado & Pago
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Pronto para Conectar
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 max-w-2xl">
                    Cadastre a URL do webhook abaixo na plataforma do seu bot (<span className="text-emerald-400 font-semibold">FireBot</span>). 
                    Todas as cobranças PIX geradas e pagas no bot serão sincronizadas aqui em tempo real.
                  </p>
                </div>

                {/* Botões de Simulação / Teste Rápido */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSimulateOrder("created")}
                    disabled={simulating}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Testar PIX Gerado</span>
                  </button>

                  <button
                    onClick={() => handleSimulateOrder("paid")}
                    disabled={simulating}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Testar PIX Pago (R$ 29,90)</span>
                  </button>

                  <button
                    onClick={handleResetOrders}
                    title="Limpar histórico de vendas"
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Campo com a URL do Webhook para Copiar */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-8 space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5 text-emerald-400" />
                    URL do Webhook (Cole no Painel do FireBot)
                  </label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-2xl p-2 px-3 shadow-inner">
                    <span className="text-[11px] font-bold uppercase px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-mono">
                      POST
                    </span>
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/firebot` : "/api/webhooks/firebot"}
                      className="bg-transparent text-xs lg:text-sm text-zinc-200 font-mono flex-1 focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopyWebhookUrl}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3.5 text-xs text-zinc-400 space-y-1.5">
                  <div className="font-bold text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Eventos Automáticos
                  </div>
                  <ul className="text-[11px] space-y-1 list-disc list-inside text-zinc-400">
                    <li><strong className="text-zinc-200">PIX Gerado:</strong> Registra intenção de compra e UTM</li>
                    <li><strong className="text-zinc-200">PIX Pago:</strong> Confirma receita em R$ e converte o lead</li>
                    <li><strong className="text-zinc-200">Compatível:</strong> FireBot, PushinPay, Kiwify e Bots Telegram</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2. Cards de Faturamento & Métricas do Firebot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Card 1: Faturamento Aprovado */}
              <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -z-10" />
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Faturamento Real</span>
                  <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                  R$ {ordersData ? ordersData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{ordersData?.paidOrders || 0} PIX pagos confirmados</span>
                </div>
              </div>

              {/* Card 2: PIX Pagos vs Gerados */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Conversão de Checkout</span>
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                  {ordersData?.conversionRate || 0}%
                </div>
                <div className="text-xs text-zinc-400">
                  <span className="text-white font-bold">{ordersData?.paidOrders || 0}</span> pagos de{" "}
                  <span className="text-white font-bold">{ordersData?.totalOrders || 0}</span> PIX gerados
                </div>
              </div>

              {/* Card 3: Ticket Médio */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ticket Médio</span>
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Star className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                  R$ {ordersData ? ordersData.averageTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                </div>
                <div className="text-xs text-zinc-400">
                  Valor médio de cada venda confirmada
                </div>
              </div>

              {/* Card 4: Faturamento por Clique (EPC) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Receita por Clique (EPC)</span>
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight mb-2">
                  R$ {stats?.totalClicks && stats.totalClicks > 0 && ordersData?.totalRevenue
                    ? (ordersData.totalRevenue / stats.totalClicks).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : "0,00"}
                </div>
                <div className="text-xs text-zinc-400">
                  Faturamento médio a cada clique no Telegram
                </div>
              </div>
            </div>

            {/* 3. Funil Completo: Da LP ao Pagamento */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 shadow-sm">
              <div className="mb-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Funil Completo de Conversão (Landing Page ➡️ Bot FireBot ➡️ PIX Pago)
                </h3>
                <p className="text-xs text-zinc-400">
                  Acompanhe exatamente quantos visitantes da página viraram cliques no Telegram e quantos pagaram o VIP
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Etapa 1: Visitas */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-1 relative">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">1. Visitantes LP</span>
                  <div className="text-2xl font-black text-white">{stats?.totalVisits || 0}</div>
                  <span className="text-[11px] text-zinc-400">100% tráfego</span>
                </div>

                {/* Etapa 2: Cliques Telegram */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-1 relative">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">2. Foram pro Bot</span>
                  <div className="text-2xl font-black text-blue-400">{stats?.totalClicks || 0}</div>
                  <span className="text-[11px] text-zinc-400">{stats?.conversionRate || 0}% dos visitantes</span>
                </div>

                {/* Etapa 3: PIX Gerados */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center space-y-1 relative">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">3. PIX Gerados</span>
                  <div className="text-2xl font-black text-amber-400">{ordersData?.totalOrders || 0}</div>
                  <span className="text-[11px] text-zinc-400">Intenções no bot</span>
                </div>

                {/* Etapa 4: PIX Pagos */}
                <div className="bg-zinc-950 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-1 relative shadow-lg shadow-emerald-500/5">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">4. PIX Pagos</span>
                  <div className="text-2xl font-black text-emerald-400">{ordersData?.paidOrders || 0}</div>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    R$ {ordersData ? ordersData.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Tabela de Atribuição por UTM Source / Campanhas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Vendas por UTM Source */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      Faturamento por Canal (UTM Source)
                    </h3>
                    <p className="text-[11px] text-zinc-400">Descubra qual canal trouxe as vendas reais</p>
                  </div>
                </div>

                {ordersData?.topSources && ordersData.topSources.length > 0 ? (
                  <div className="space-y-2.5">
                    {ordersData.topSources.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                            {item.source}
                          </span>
                          <div className="text-[11px] text-zinc-400">
                            {item.paid} pagos de {item.orders} gerados • <span className="text-emerald-400 font-semibold">{item.cr}% conv.</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-400 font-mono">
                            R$ {item.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Nenhum pedido registrado para este período ainda.
                  </div>
                )}
              </div>

              {/* Vendas por Campanha */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Faturamento por Campanha (UTM Campaign)
                    </h3>
                    <p className="text-[11px] text-zinc-400">Retorno de investimento por criativo e campanha</p>
                  </div>
                </div>

                {ordersData?.topCampaigns && ordersData.topCampaigns.length > 0 ? (
                  <div className="space-y-2.5">
                    {ordersData.topCampaigns.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-white text-[11px]">
                            {item.campaign}
                          </span>
                          <div className="text-[11px] text-zinc-400">
                            {item.paid} pagos de {item.orders} gerados • <span className="text-purple-400 font-semibold">{item.cr}% conv.</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-white font-mono">
                            R$ {item.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Nenhuma campanha com vendas registradas ainda.
                  </div>
                )}
              </div>
            </div>

            {/* 5. Tabela de Transações / Pedidos em Tempo Real */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Transações & Eventos Recebidos do FireBot
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Histórico detalhado de cada PIX gerado e pago com parâmetros de rastreamento
                  </p>
                </div>

                {/* Filtros de Status & Busca */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por cliente, @telegram, UTM..."
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors w-48 lg:w-64"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                    <button
                      onClick={() => setOrderStatusFilter("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        orderStatusFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setOrderStatusFilter("paid")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        orderStatusFilter === "paid" ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Pagos 🟢
                    </button>
                    <button
                      onClick={() => setOrderStatusFilter("pending")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                        orderStatusFilter === "pending" ? "bg-amber-500/20 text-amber-400" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Aguardando 🟡
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Pedidos */}
              {filteredOrdersList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-semibold">
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Data / Hora</th>
                        <th className="py-3 px-3">Valor</th>
                        <th className="py-3 px-3">Cliente / Telegram</th>
                        <th className="py-3 px-3">Produto</th>
                        <th className="py-3 px-3">Origem (UTM)</th>
                        <th className="py-3 px-3 text-right">Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {filteredOrdersList.map((order) => {
                        const oDate = new Date(order.createdAt);
                        const formattedTime = oDate.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });

                        const isPaid = order.status === "paid";
                        const isPending = order.status === "pending";

                        return (
                          <tr key={order.id} className="hover:bg-zinc-800/40 transition-colors">
                            {/* Status */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  PIX Pago
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px]">
                                  <Clock className="w-2.5 h-2.5" />
                                  PIX Gerado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-700/40 text-zinc-400 border border-zinc-700 font-bold text-[10px]">
                                  {order.status}
                                </span>
                              )}
                            </td>

                            {/* Data/Hora */}
                            <td className="py-3 px-3 text-zinc-300 whitespace-nowrap font-sans text-xs">
                              {formattedTime}
                            </td>

                            {/* Valor */}
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`font-extrabold ${isPaid ? "text-emerald-400 text-sm" : "text-zinc-300"}`}>
                                R$ {order.amount.toFixed(2)}
                              </span>
                            </td>

                            {/* Cliente / Telegram */}
                            <td className="py-3 px-3 font-sans">
                              <div className="space-y-0.5">
                                <div className="font-semibold text-white text-xs">
                                  {order.customerName || "Cliente"}
                                </div>
                                {order.telegramUsername ? (
                                  <a
                                    href={`https://t.me/${order.telegramUsername}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    @{order.telegramUsername}
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                ) : order.telegramId ? (
                                  <div className="text-[10px] text-zinc-500">ID: {order.telegramId}</div>
                                ) : null}
                              </div>
                            </td>

                            {/* Produto */}
                            <td className="py-3 px-3 font-sans text-zinc-300 text-xs">
                              {order.productName || "VIP Marcinha"}
                            </td>

                            {/* UTM */}
                            <td className="py-3 px-3">
                              <div className="flex flex-col gap-1">
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px] w-fit font-bold uppercase">
                                  {order.utm_source || "direto"}
                                </span>
                                {order.utm_campaign && (
                                  <span className="text-[10px] text-zinc-400 font-sans truncate max-w-[140px]">
                                    {order.utm_campaign}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Ações / Ver Payload */}
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => setSelectedPayload(order.rawPayload || {})}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-sans font-semibold border border-zinc-700 transition-colors cursor-pointer"
                              >
                                Ver JSON
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-300">Nenhum evento registrado ainda</p>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                      Use o botão <strong className="text-emerald-400">"Testar PIX Pago"</strong> acima para simular uma venda instantaneamente, ou envie um PIX real pelo FireBot.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= ABA 2: EDITOR VISUAL DE COPYS, HOOKS & FOTOS ================= */}
        {activeTab === "editor" && config && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulário de Configuração & Testes de A/B */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Editor de Copys, Hooks & Visual</h2>
                  <p className="text-xs text-zinc-400">Teste diferentes abordagens, imagens e chamadas com 1 clique</p>
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
                </button>
              </div>

              {/* 1. SEÇÃO DE FOTOS & GALERIA DE CRIATIVOS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Galeria de Fotos da Modelo (Troca com 1 Clique)
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    {config.savedPhotos?.length || 1} fotos salvas
                  </span>
                </div>

                {/* Lista de Miniaturas Salvas */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {(config.savedPhotos || [config.photoUrl]).map((photoItem, idx) => (
                    <div
                      key={idx}
                      onClick={() => setConfig({ ...config, photoUrl: photoItem })}
                      className={`relative w-20 h-24 rounded-2xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                        config.photoUrl === photoItem
                          ? "border-blue-500 ring-4 ring-blue-500/20 scale-105"
                          : "border-zinc-800 opacity-70 hover:opacity-100 hover:border-zinc-600"
                      }`}
                    >
                      <Image
                        src={photoItem}
                        alt="Foto da Modelo"
                        fill
                        className="object-cover"
                      />
                      {config.photoUrl === photoItem && (
                        <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5 shadow">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Botão de Upload de Mais Fotos */}
                  <label className="w-20 h-24 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 flex flex-col items-center justify-center gap-1.5 shrink-0 cursor-pointer bg-zinc-950/60 text-zinc-400 hover:text-white transition-colors">
                    <Upload className="w-5 h-5 text-blue-400" />
                    <span className="text-[10px] font-bold text-center leading-tight">
                      {uploading ? "Enviando..." : "+ Enviar Nova"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Estilo de Iluminação / Vinheta */}
                <div className="pt-2">
                  <span className="block text-xs text-zinc-400 mb-1.5">Efeito de Vinheta da Foto:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Cinematográfico", value: "cinematic" },
                      { label: "Foco Intenso", value: "heavy" },
                      { label: "Fundo Limpo", value: "clean" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setConfig({ ...config, overlayStyle: opt.value as any })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          (config.overlayStyle || "cinematic") === opt.value
                            ? "bg-blue-600 text-white border-blue-500 shadow"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. TESTES DE HOOKS & COPYS (TOPO) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Hook / Chamada de Atenção Superior
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showHookHeadline}
                      onChange={(e) => setConfig({ ...config, showHookHeadline: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                    />
                    <span className="text-xs text-zinc-300">Exibir Hook no Topo</span>
                  </label>
                </div>

                {config.showHookHeadline && (
                  <div className="space-y-2 bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800">
                    <input
                      type="text"
                      value={config.hookHeadline || ""}
                      onChange={(e) => setConfig({ ...config, hookHeadline: e.target.value })}
                      placeholder="Ex: Ela está te esperando no Telegram... 🔞"
                      className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />

                    <div>
                      <span className="text-[11px] text-zinc-500 block mb-1.5">Hooks Prontos para Testar:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {hookPresets.map((hk, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setConfig({ ...config, hookHeadline: hk })}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 cursor-pointer"
                          >
                            {hk}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Prova Social & Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300">Badge de Status</span>
                      <input
                        type="checkbox"
                        checked={config.showBadge}
                        onChange={(e) => setConfig({ ...config, showBadge: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                      />
                    </div>
                    <input
                      type="text"
                      value={config.badgeText}
                      onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                      placeholder="Online agora • VIP"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none font-semibold"
                    />
                  </div>

                  <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300">Urgência / Pessoas Online</span>
                      <input
                        type="checkbox"
                        checked={config.showUrgencyBadge}
                        onChange={(e) => setConfig({ ...config, showUrgencyBadge: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                      />
                    </div>
                    <input
                      type="text"
                      value={config.urgencyBadge || "🔥 142 pessoas online agora"}
                      onChange={(e) => setConfig({ ...config, urgencyBadge: e.target.value })}
                      placeholder="🔥 142 pessoas online agora"
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 3. TESTES DE CTA (BOTÃO DE CONVERSÃO) */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Botão de Ação (CTA) & Variações de Conversão
                </label>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Texto Principal do Botão</label>
                  <input
                    type="text"
                    value={config.buttonText}
                    onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                    placeholder="Acessar agora"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ctaPresets.map((cta, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setConfig({ ...config, buttonText: cta })}
                        className="px-2.5 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 cursor-pointer"
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor de Ícone do Botão */}
                <div>
                  <span className="block text-xs text-zinc-400 mb-1.5">Ícone do Botão:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: "telegram", label: "Telegram", icon: Send },
                      { id: "fire", label: "Fogo 🔥", icon: Flame },
                      { id: "lock", label: "VIP 🔒", icon: Lock },
                      { id: "heart", label: "Love ❤️", icon: Heart },
                      { id: "bolt", label: "Raio ⚡", icon: Zap },
                      { id: "star", label: "Estrela ⭐", icon: Star },
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = (config.ctaIcon || "telegram") === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setConfig({ ...config, ctaIcon: item.id as any })}
                          className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-blue-600 text-white border-blue-500 shadow-md"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[10px] font-semibold">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cores do Botão */}
                <div>
                  <span className="block text-xs text-zinc-400 mb-2">Paletas de Cores:</span>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            buttonBgColor: preset.bg,
                            buttonTextColor: preset.text,
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                          config.buttonBgColor === preset.bg
                            ? "border-white ring-2 ring-blue-500 scale-105"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        style={{ backgroundColor: preset.bg, color: preset.text }}
                      >
                        <span className="drop-shadow-sm">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cor Hex do Botão</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.buttonBgColor}
                        onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-zinc-700 cursor-pointer bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={config.buttonBgColor}
                        onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cor do Texto</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.buttonTextColor}
                        onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                        className="w-10 h-10 rounded-xl border border-zinc-700 cursor-pointer bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={config.buttonTextColor}
                        onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                        className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={config.buttonGlow}
                    onChange={(e) => setConfig({ ...config, buttonGlow: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300">
                    Ativar animação contínua de pulso e brilho (Glow Effect)
                  </span>
                </label>
              </div>

              {/* 4. LINK DE DESTINO & RODAPÉ */}
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Link de Destino do Telegram
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={config.telegramUrl}
                      onChange={(e) => setConfig({ ...config, telegramUrl: e.target.value })}
                      placeholder="https://t.me/seubot"
                      className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <a
                      href={config.telegramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors"
                    >
                      <span>Testar</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <div className="bg-zinc-950/70 p-3 rounded-2xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">Aviso / Disclaimer do Rodapé</span>
                    <input
                      type="checkbox"
                      checked={config.showFooterDisclaimer}
                      onChange={(e) => setConfig({ ...config, showFooterDisclaimer: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.footerDisclaimer || "Acesso direto e verificado • +18"}
                    onChange={(e) => setConfig({ ...config, footerDisclaimer: e.target.value })}
                    placeholder="Acesso direto e verificado • +18"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Simulador Mobile em Tempo Real */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="sticky top-20 w-full max-w-[340px]">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    Simulador ao Vivo
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">● Atualização Instantânea</span>
                </div>

                {/* Moldura do Smartphone */}
                <div className="relative w-full aspect-[9/18] max-h-[640px] rounded-[42px] border-[10px] border-zinc-800 bg-black overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col justify-between">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-full z-30" />

                  {/* Foto de Fundo */}
                  <div className="absolute inset-0 w-full h-full">
                    <Image
                      src={config.photoUrl}
                      alt="Preview"
                      fill
                      className="object-cover object-top"
                    />

                    {config.overlayStyle === "heavy" ? (
                      <>
                        <div className="absolute inset-0 bg-black/45" />
                        <div className="absolute inset-x-0 bottom-0 h-4/5 bg-gradient-to-t from-black via-black/90 to-transparent" />
                      </>
                    ) : config.overlayStyle === "clean" ? (
                      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 to-transparent" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/30" />
                        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/85 to-transparent" />
                      </>
                    )}
                  </div>

                  {/* Topo Preview */}
                  <div className="relative z-20 pt-8 px-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      {config.showBadge && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                          <span>{config.badgeText}</span>
                        </div>
                      )}

                      {config.showUrgencyBadge && config.urgencyBadge && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-[10px] font-bold text-amber-300 shadow">
                          <span>{config.urgencyBadge}</span>
                        </div>
                      )}
                    </div>

                    {config.showHookHeadline && config.hookHeadline && (
                      <div className="bg-black/65 backdrop-blur-md border border-white/20 px-3 py-2 rounded-xl shadow-lg text-center">
                        <p className="text-[11px] font-extrabold text-white leading-tight">
                          {config.hookHeadline}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Botão Preview */}
                  <div className="relative z-20 px-4 pb-8 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      style={{
                        backgroundColor: config.buttonBgColor,
                        color: config.buttonTextColor,
                      }}
                      className={`relative w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 border border-white/20 shadow-xl ${
                        config.buttonGlow ? "animate-cta-pulse" : ""
                      }`}
                    >
                      {config.ctaIcon === "fire" ? (
                        <Flame className="w-4 h-4 fill-amber-300" />
                      ) : config.ctaIcon === "lock" ? (
                        <Lock className="w-4 h-4" />
                      ) : config.ctaIcon === "heart" ? (
                        <Heart className="w-4 h-4 fill-rose-300" />
                      ) : (
                        <Send className="w-4 h-4 fill-current" />
                      )}
                      <span className="truncate">{config.buttonText}</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-75" />
                    </button>

                    {config.showFooterDisclaimer && (
                      <span className="text-[10px] text-zinc-400 font-medium">
                        🛡️ {config.footerDisclaimer || "Acesso direto e verificado"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 3: FEED DE VISITANTES & CLICKS ================= */}
        {activeTab === "feed" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Feed de Acessos em Tempo Real
                </h3>
                <p className="text-xs text-zinc-400">
                  Histórico completo de cada visitante, dispositivo, cidade e status de clique
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter("clicked")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === "clicked" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    🎯 Clicaram ({stats?.totalClicks || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter("viewed")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      statusFilter === "viewed" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    👀 Visualizaram
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar IP, cidade, UF, UTM..."
                    value={searchLog}
                    onChange={(e) => setSearchLog(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-64"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-2xl border border-zinc-800/80">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-zinc-400 z-10">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Hora Exata</th>
                    <th className="py-3 px-4 font-semibold">Status de Conversão</th>
                    <th className="py-3 px-4 font-semibold">Canal (UTM Source)</th>
                    <th className="py-3 px-4 font-semibold">Campanha / Criativo</th>
                    <th className="py-3 px-4 font-semibold">Dispositivo & SO</th>
                    <th className="py-3 px-4 font-semibold">Navegador</th>
                    <th className="py-3 px-4 font-semibold">Estado & Cidade</th>
                    <th className="py-3 px-4 font-semibold">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {filteredLogs?.length ? (
                    filteredLogs.map((visit) => (
                      <tr key={visit.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                          {new Date(visit.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-sans">
                          {visit.clicked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Clicou no Telegram
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700 text-xs">
                              <Eye className="w-3.5 h-3.5" /> Visualizou
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-blue-400 capitalize">
                          {visit.utm_source}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300">
                          <span>{visit.utm_campaign || "-"}</span>
                          {visit.utm_content && (
                            <span className="text-[11px] text-zinc-500 block">criativo: {visit.utm_content}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300">
                          {visit.device} • {visit.os}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300">
                          {visit.isInAppBrowser ? (
                            <span className="text-pink-400 font-semibold">{visit.browser} (In-App)</span>
                          ) : (
                            visit.browser
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-zinc-300 whitespace-nowrap">
                          📍 <b className="text-white">{visit.region || "BR"}</b> • {visit.city || "Desconhecido"}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 text-[11px] font-mono">
                          {visit.ip}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500 font-sans">
                        Nenhum acesso registrado com os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= ABA 4: GERADOR DE LINKS UTM ================= */}
        {activeTab === "generator" && (
          <div className="max-w-3xl mx-auto bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-400" />
                Gerador de Links de Rastreamento (UTM Builder)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Crie links rastreados prontos para colocar em anúncios do TikTok, Instagram, biografias ou parcerias.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Canal de Tráfego (UTM Source)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "TikTok Ads", value: "tiktok_ads" },
                    { label: "Instagram Ads", value: "instagram_ads" },
                    { label: "Instagram Bio", value: "instagram_bio" },
                    { label: "Telegram VIP", value: "telegram_canal" },
                    { label: "Facebook Ads", value: "facebook_ads" },
                    { label: "X / Twitter", value: "twitter" },
                    { label: "Influencer", value: "parceria_influencer" },
                    { label: "Outro", value: "custom" },
                  ].map((chan) => (
                    <button
                      key={chan.value}
                      type="button"
                      onClick={() => setGeneratorChannel(chan.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        generatorChannel === chan.value
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      {chan.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nome da Campanha (UTM Campaign)
                  </label>
                  <input
                    type="text"
                    value={generatorCampaign}
                    onChange={(e) => setGeneratorCampaign(e.target.value)}
                    placeholder="Ex: stories_vip_01"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Criativo / Conteúdo (UTM Content)
                  </label>
                  <input
                    type="text"
                    value={generatorCreative}
                    onChange={(e) => setGeneratorCreative(e.target.value)}
                    placeholder="Ex: video_lingerie_02"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  Seu Link Rastreável Pronto:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedUrl}
                    className="flex-1 px-4 py-3 bg-zinc-950 border border-emerald-500/30 rounded-xl text-xs font-mono text-emerald-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedUrl, "Link")}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-[0.98]"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 5: PIXELS & SUPABASE ================= */}
        {activeTab === "settings" && config && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Banco de Dados & Armazenamento (Supabase)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Garante persistência total e dados reais de acessos, conversões e fotos na nuvem
                  </p>
                </div>

                {supabaseStatus?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conectado ao Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Modo Local / Aguardando Chaves
                  </span>
                )}
              </div>

              {supabaseStatus?.connected ? (
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs space-y-2">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>URL do Projeto Supabase:</span>
                    <span className="font-mono text-emerald-400 font-semibold">{supabaseStatus.url}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Total de Acessos Gravados no PostgreSQL:</span>
                    <span className="font-bold text-white font-mono">{supabaseStatus.visitsCount} registros</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 text-xs space-y-2 text-zinc-400">
                  <p>
                    {supabaseStatus?.message ||
                      "Para vincular o Supabase, defina as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel."}
                  </p>
                </div>
              )}
            </div>

            {/* Pixels de Rastreamento */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  Pixels & Códigos de Conversão
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Adicione seus IDs de pixel para disparar eventos automáticos no Facebook, TikTok e Google
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Facebook Pixel ID (Meta Ads)
                  </label>
                  <input
                    type="text"
                    value={config.facebookPixelId || ""}
                    onChange={(e) => setConfig({ ...config, facebookPixelId: e.target.value })}
                    placeholder="Ex: 123456789012345"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    TikTok Pixel ID
                  </label>
                  <input
                    type="text"
                    value={config.tiktokPixelId || ""}
                    onChange={(e) => setConfig({ ...config, tiktokPixelId: e.target.value })}
                    placeholder="Ex: C8XXXXXXXXXXXXXXXXXX"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Google Analytics ID / GTM
                  </label>
                  <input
                    type="text"
                    value={config.googleAnalyticsId || ""}
                    onChange={(e) => setConfig({ ...config, googleAnalyticsId: e.target.value })}
                    placeholder="Ex: G-XXXXXXXXXX ou GTM-XXXXXX"
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    {saving ? "Salvando..." : "Salvar Pixels"}
                  </button>
                </div>
              </div>
            </div>

            {/* Senha do Admin */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  Segurança do Painel Admin
                </h3>
                <p className="text-xs text-zinc-400 mt-1">Altere a senha usada para entrar neste painel de controle</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nova Senha de Admin</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.adminPassword}
                    onChange={(e) => setConfig({ ...config, adminPassword: e.target.value })}
                    className="flex-1 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    Atualizar Senha
                  </button>
                </div>
              </div>
            </div>

            {/* Limpeza de Dados */}
            <div className="bg-red-950/20 border border-red-900/40 rounded-3xl p-6 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Limpeza de Dados de Teste
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Zere todos os acessos e cliques de teste antes de iniciar as campanhas oficiais de tráfego.
                </p>
              </div>

              <button
                onClick={handleResetStats}
                className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar Todas as Estatísticas
              </button>
            </div>
          </div>
        )}

        {/* Modal de Inspeção de JSON / Payload do Webhook */}
        {selectedPayload && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Payload Bruto do Webhook (JSON)</h3>
                </div>
                <button
                  onClick={() => setSelectedPayload(null)}
                  className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 font-mono text-xs text-emerald-400">
                <pre>{JSON.stringify(selectedPayload, null, 2)}</pre>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedPayload, null, 2), "JSON")}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar JSON</span>
                </button>

                <button
                  onClick={() => setSelectedPayload(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
