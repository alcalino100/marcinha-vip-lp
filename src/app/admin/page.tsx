"use client";

import { useState, useEffect, useRef } from "react";
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
  Layers,
  ChevronRight,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { LandingConfig, VisitEvent } from "@/lib/types";

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
  const [activeTab, setActiveTab] = useState<"stats" | "feed" | "generator" | "editor" | "settings">("stats");
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("today");

  // Configuração atual da LP
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Estatísticas
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Filtros do Feed de Visitantes
  const [searchLog, setSearchLog] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "clicked" | "viewed">("all");
  const [deviceFilter, setDeviceFilter] = useState<string>("all");

  // Auto-refresh (Tempo Real)
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // 15 segundos padrão
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

  // Calculadora de ROI Estimado
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
      // Tenta recuperar do cookie
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
    fetchSupabaseStatus();
  }, [isAuthenticated, adminToken, period]);

  // 3. Auto-Refresh em Tempo Real
  useEffect(() => {
    if (!isAuthenticated || !adminToken || autoRefreshInterval <= 0) return;

    const timer = setInterval(() => {
      fetchStats(true);
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
        // Grava cookie para backup de sessão
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
        setConfig((prev) => (prev ? { ...prev, photoUrl: data.url } : null));
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
    if (!confirm("Tem certeza que deseja zerar TODAS as estatísticas de visitas e cliques? Essa ação é irreversível.")) {
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
    toast.success(`${label} copiado para a área de transferência!`);
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

  // Filtra logs de visitas com busca e tags
  const filteredLogs = stats?.recentVisits?.filter((v) => {
    if (statusFilter === "clicked" && !v.clicked) return false;
    if (statusFilter === "viewed" && v.clicked) return false;
    if (deviceFilter !== "all" && v.device !== deviceFilter) return false;

    if (!searchLog) return true;
    const term = searchLog.toLowerCase();
    return (
      v.utm_source.toLowerCase().includes(term) ||
      v.utm_campaign.toLowerCase().includes(term) ||
      (v.utm_content && v.utm_content.toLowerCase().includes(term)) ||
      v.city.toLowerCase().includes(term) ||
      v.device.toLowerCase().includes(term) ||
      v.browser.toLowerCase().includes(term) ||
      v.ip.includes(term)
    );
  });

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
            <p className="text-[11px] text-zinc-400">Controle de Conversão & Mídia Paga</p>
          </div>
        </div>

        {/* Controles de Atualização & Ações */}
        <div className="flex items-center gap-2">
          {/* Indicador de Auto-refresh */}
          <div className="hidden sm:flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-400 text-[11px]">Tempo Real:</span>
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
            onClick={() => fetchStats()}
            title="Atualizar dados agora"
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin text-blue-400" : ""}`} />
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
          Métricas & Tráfego
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
          onClick={() => setActiveTab("editor")}
          className={`py-3.5 text-xs lg:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "editor"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Palette className="w-4 h-4" />
          Personalizar Página & Visual
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
        {/* ================= ABA 1: MÉTRICAS & TRÁFEGO ================= */}
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
                <p className="text-xs text-zinc-500 mt-1">Taxa de Cliques / Visitas (CTR)</p>
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

              {/* Navegadores & In-App (Instagram/TikTok Ads) */}
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

                {/* Top Localizações */}
                <div className="pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2.5">
                    Top Cidades & Regiões
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

            {/* Gráfico de Acessos 24 Horas */}
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
                        {/* Tooltip no hover */}
                        <div className="absolute -top-12 bg-black/90 px-2.5 py-1 rounded-lg border border-zinc-700 text-[10px] text-zinc-200 hidden group-hover:flex flex-col items-center z-30 whitespace-nowrap shadow-xl">
                          <span>{hour}</span>
                          <span className="font-bold text-blue-400">{visitsCount} visitas</span>
                          <span className="font-bold text-emerald-400">{clicksCount} cliques</span>
                        </div>

                        {/* Barra */}
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

        {/* ================= ABA 2: FEED DE VISITANTES & CLICKS ================= */}
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

              {/* Filtros rápidos */}
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
                    placeholder="Buscar IP, cidade, UTM..."
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
                    <th className="py-3 px-4 font-semibold">Localização</th>
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
                          📍 {visit.city || "Desconhecido"} {visit.region ? `(${visit.region})` : ""}
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

        {/* ================= ABA 3: GERADOR DE LINKS UTM ================= */}
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

              {/* Link Gerado */}
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
                    onClick={() => copyToClipboard(generatedUrl, "Link rastreável")}
                    className="flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-[0.98]"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link</span>
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 mt-2">
                  Cole este link nos seus anúncios. Toda vez que um usuário clicar, o painel saberá a fonte exata e o Telegram também receberá esses dados.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 4: PERSONALIZAR PÁGINA & VISUAL ================= */}
        {activeTab === "editor" && config && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulário de Edição */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Editor Visual da Página</h2>
                  <p className="text-xs text-zinc-400">Modifique links, fotos, cores e textos instantaneamente</p>
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

              {/* 1. Link de Destino Telegram */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Link de Destino do Telegram
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Send className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-400" />
                    <input
                      type="url"
                      value={config.telegramUrl}
                      onChange={(e) => setConfig({ ...config, telegramUrl: e.target.value })}
                      placeholder="https://t.me/seubot"
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
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

                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.forwardUtms}
                    onChange={(e) => setConfig({ ...config, forwardUtms: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300">
                    Repassar parâmetros UTMs automaticamente ao Telegram (essencial para tracking do bot)
                  </span>
                </label>
              </div>

              {/* 2. Foto da Modelo */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Foto da Modelo de IA
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-20 rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0 shadow-lg">
                    <Image
                      src={config.photoUrl}
                      alt="Modelo Preview"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white border border-zinc-700 cursor-pointer transition-colors shadow-sm">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>{uploading ? "Enviando para o Supabase..." : "Fazer Upload de Nova Foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">ou URL direta:</span>
                      <input
                        type="text"
                        value={config.photoUrl}
                        onChange={(e) => setConfig({ ...config, photoUrl: e.target.value })}
                        placeholder="/uploads/foto.jpg ou https://..."
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Textos da Página */}
              <div className="space-y-4 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Textos da Página & Botão
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Texto Principal do Botão</label>
                    <input
                      type="text"
                      value={config.buttonText}
                      onChange={(e) => setConfig({ ...config, buttonText: e.target.value })}
                      placeholder="Acessar agora"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Badge Superior</label>
                    <input
                      type="text"
                      value={config.badgeText}
                      onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                      placeholder="Online agora • VIP"
                      className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showBadge}
                      onChange={(e) => setConfig({ ...config, showBadge: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                    />
                    <span className="text-xs text-zinc-300">Exibir Badge Superior ("Online agora")</span>
                  </label>
                </div>
              </div>

              {/* 4. Cores e Efeitos */}
              <div className="space-y-4 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Estilo & Cores do Botão
                </label>

                {/* Presets rápidos */}
                <div>
                  <span className="block text-xs text-zinc-400 mb-2">Paletas de Alta Conversão:</span>
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
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
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

                {/* Seletor Customizado Hexadecimal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cor do Fundo do Botão</label>
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
                    <label className="block text-xs text-zinc-400 mb-1">Cor do Texto do Botão</label>
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

                {/* Efeito Glow / Pulso */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={config.buttonGlow}
                    onChange={(e) => setConfig({ ...config, buttonGlow: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300">
                    Ativar animação contínua de pulso e brilho (Glow Effect para aumentar CTR)
                  </span>
                </label>
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/30" />
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/85 to-transparent" />
                  </div>

                  {/* Topo Preview */}
                  <div className="relative z-20 pt-8 px-4 flex justify-between items-center">
                    {config.showBadge && (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        <span>{config.badgeText}</span>
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
                      <Send className="w-4 h-4 shrink-0 fill-current" />
                      <span className="truncate">{config.buttonText}</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-75" />
                    </button>
                    <span className="text-[10px] text-zinc-400">🛡️ Acesso direto e verificado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 5: PIXELS & SUPABASE ================= */}
        {activeTab === "settings" && config && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Status do Supabase */}
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
                      "Para vincular o Supabase, defina as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel ou no .env.local."}
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

            {/* Zona de Perigo */}
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
      </main>
    </div>
  );
}
