"use client";

import { useState, useEffect, useTransition } from "react";
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
  const [activeTab, setActiveTab] = useState<"stats" | "editor" | "settings">("stats");
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("today");

  // Configuração atual da LP
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  // Estatísticas
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [searchLog, setSearchLog] = useState("");

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

  // Checa token salvo
  useEffect(() => {
    const savedToken = localStorage.getItem("marcinha_admin_token");
    if (savedToken) {
      setAdminToken(savedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Carrega configurações e estatísticas quando autenticado
  useEffect(() => {
    if (!isAuthenticated || !adminToken) return;

    fetchConfig();
    fetchStats();
    fetchSupabaseStatus();
  }, [isAuthenticated, adminToken, period]);

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
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      toast.error("Falha ao carregar configurações");
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      toast.error("Falha ao carregar estatísticas");
    } finally {
      setLoadingStats(false);
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
    setAdminToken("");
    setIsAuthenticated(false);
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
        toast.success("Configurações atualizadas com sucesso!");
      } else {
        toast.error("Falha ao salvar configurações");
      }
    } catch {
      toast.error("Erro ao conectar com o servidor");
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
        toast.success("Nova foto da modelo enviada com sucesso!");
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
    if (!confirm("Tem certeza que deseja zerar todas as estatísticas de visitas e cliques?")) return;

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res.ok) {
        toast.success("Estatísticas reinicializadas!");
        fetchStats();
      }
    } catch {
      toast.error("Erro ao zerar dados");
    }
  };

  const exportCSV = () => {
    if (!stats?.recentVisits?.length) {
      toast.error("Sem dados para exportar");
      return;
    }

    const headers = ["Data/Hora", "IP", "Dispositivo", "SO", "Navegador", "Cidade", "UF", "UTM Source", "UTM Campaign", "Clicou"];
    const rows = stats.recentVisits.map((v) => [
      new Date(v.timestamp).toLocaleString("pt-BR"),
      v.ip,
      v.device,
      v.os,
      v.browser,
      v.city,
      v.region,
      v.utm_source,
      v.utm_campaign,
      v.clicked ? "SIM" : "NAO",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `visitas_marcinha_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Planilha CSV baixada!");
  };

  // Cores pré-definidas para o botão
  const colorPresets = [
    { name: "Telegram Azul", bg: "#229ED9", text: "#ffffff" },
    { name: "Rosa Sexy", bg: "#ec4899", text: "#ffffff" },
    { name: "Vermelho Hot", bg: "#f43f5e", text: "#ffffff" },
    { name: "Verde Neon", bg: "#10b981", text: "#ffffff" },
    { name: "Dourado VIP", bg: "#f59e0b", text: "#000000" },
    { name: "Roxo Cyber", bg: "#8b5cf6", text: "#ffffff" },
    { name: "Preto Luxo", bg: "#18181b", text: "#ffffff" },
  ];

  // Filtra logs de visitas pelo termo de busca
  const filteredLogs = stats?.recentVisits.filter((v) => {
    if (!searchLog) return true;
    const term = searchLog.toLowerCase();
    return (
      v.utm_source.toLowerCase().includes(term) ||
      v.utm_campaign.toLowerCase().includes(term) ||
      v.city.toLowerCase().includes(term) ||
      v.device.toLowerCase().includes(term) ||
      v.browser.toLowerCase().includes(term) ||
      v.ip.includes(term)
    );
  });

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Painel Admin</h1>
            <p className="text-sm text-zinc-400 mt-1">Marcinha VIP • Controle & Analytics</p>
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
                placeholder="Digite a senha do painel..."
                required
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <p className="text-[11px] text-zinc-500 mt-2">
                Dica padrão inicial: <code className="text-blue-400">marcinha2026</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98]"
            >
              Entrar no Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 lg:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
            M
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Painel Marcinha VIP
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Página de conversão mobile & analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition-colors"
          >
            <span>Ver Página</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchStats}
            title="Atualizar dados"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleLogout}
            title="Sair do painel"
            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="bg-zinc-900/50 border-b border-zinc-800 px-4 lg:px-8 flex gap-6">
        <button
          onClick={() => setActiveTab("stats")}
          className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "stats"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Métricas & Tráfego
        </button>

        <button
          onClick={() => setActiveTab("editor")}
          className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
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
          className={`py-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "settings"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Pixels & Configurações
        </button>
      </nav>

      {/* Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
        {/* ================= ABA 1: MÉTRICAS & TRÁFEGO ================= */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Filtro de Período */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold text-zinc-300">Período:</span>
                <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(["today", "7d", "30d", "all"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        period === p ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {p === "today" ? "Hoje" : p === "7d" ? "7 Dias" : p === "30d" ? "30 Dias" : "Todos"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 border border-zinc-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Total de Acessos</span>
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">
                  {stats?.totalVisits ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {stats?.uniqueVisits ?? 0} visitantes únicos (IP)
                </p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Cliques no Botão</span>
                  <MousePointerClick className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400">
                  {stats?.totalClicks ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1">Redirecionados ao Telegram</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Taxa de Conversão</span>
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-purple-400">
                  {stats?.conversionRate ?? 0}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">Cliques / Visitantes</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Foco Mobile</span>
                  <Smartphone className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-2xl lg:text-3xl font-extrabold text-white">
                  {stats?.devices?.["Mobile"]
                    ? Math.round(((stats.devices["Mobile"] || 0) / (stats.totalVisits || 1)) * 100)
                    : 100}
                  %
                </div>
                <p className="text-xs text-zinc-500 mt-1">Usuários de Smartphones</p>
              </div>
            </div>

            {/* Grids de Tráfego: UTMs e Dispositivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tabela de UTM Sources */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-400" />
                    Origens de Tráfego (UTM Source)
                  </h3>
                  <span className="text-xs text-zinc-400">
                    {stats?.topSources?.length || 0} fontes
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-medium">Origem</th>
                        <th className="pb-2 font-medium text-right">Visitas</th>
                        <th className="pb-2 font-medium text-right">Cliques</th>
                        <th className="pb-2 font-medium text-right">CR %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {stats?.topSources?.length ? (
                        stats.topSources.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/30">
                            <td className="py-2.5 font-medium text-zinc-200 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span className="capitalize">{item.source}</span>
                            </td>
                            <td className="py-2.5 text-right text-zinc-300">{item.visits}</td>
                            <td className="py-2.5 text-right text-emerald-400 font-semibold">{item.clicks}</td>
                            <td className="py-2.5 text-right text-purple-400 font-bold">{item.cr}%</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-zinc-500">
                            Nenhum tráfego registrado no período
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Navegadores & In-App (Crucial para Instagram/TikTok Ads) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-pink-400" />
                    Navegadores & In-App (Apps de Origem)
                  </h3>
                </div>

                <div className="space-y-3">
                  {stats?.browsers && Object.keys(stats.browsers).length > 0 ? (
                    Object.entries(stats.browsers).map(([browser, count], idx) => {
                      const pct = Math.round((count / (stats.totalVisits || 1)) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-zinc-300">{browser}</span>
                            <span className="text-zinc-400">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-zinc-500 py-4 text-center">Nenhum dado de navegador ainda</p>
                  )}
                </div>

                {/* Top Cidades / Estados */}
                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                    Top Localizações
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {stats?.topLocations?.length ? (
                      stats.topLocations.map((loc, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-300"
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

            {/* Log de Visitantes em Tempo Real */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Feed de Acessos em Tempo Real</h3>
                  <p className="text-xs text-zinc-400">Últimos acessos e cliques registrados</p>
                </div>

                <input
                  type="text"
                  placeholder="Buscar por UTM, cidade, dispositivo..."
                  value={searchLog}
                  onChange={(e) => setSearchLog(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-64"
                />
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="py-2 px-3 font-medium">Hora</th>
                      <th className="py-2 px-3 font-medium">Status</th>
                      <th className="py-2 px-3 font-medium">UTM Source / Campanha</th>
                      <th className="py-2 px-3 font-medium">Dispositivo & SO</th>
                      <th className="py-2 px-3 font-medium">Navegador</th>
                      <th className="py-2 px-3 font-medium">Localização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredLogs?.length ? (
                      filteredLogs.map((visit) => (
                        <tr key={visit.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                            {new Date(visit.timestamp).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {visit.clicked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-sans font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Clicou no Telegram
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 text-[11px] font-sans">
                                <Eye className="w-3 h-3" /> Visualizou
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-semibold text-blue-400">{visit.utm_source}</span>
                            {visit.utm_campaign && visit.utm_campaign !== "geral" && (
                              <span className="text-zinc-400 ml-1.5 text-[11px]">({visit.utm_campaign})</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-zinc-300">
                            {visit.device} • {visit.os}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-zinc-300">
                            {visit.browser}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-zinc-400 whitespace-nowrap">
                            📍 {visit.city || "Desconhecido"} {visit.region ? `(${visit.region})` : ""}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500 font-sans">
                          Nenhum acesso correspondente encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= ABA 2: PERSONALIZAR PÁGINA & VISUAL ================= */}
        {activeTab === "editor" && config && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Formulário de Edição */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h2 className="text-lg font-bold text-white">Editor Visual da Página</h2>
                  <p className="text-xs text-zinc-400">Modifique links, fotos, cores e textos instantaneamente</p>
                </div>

                <button
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
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
                      className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <a
                    href={config.telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <span>Testar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Repasse de UTMs */}
                <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.forwardUtms}
                    onChange={(e) => setConfig({ ...config, forwardUtms: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700 focus:ring-blue-500"
                  />
                  <span className="text-xs text-zinc-300">
                    Repassar parâmetros UTMs automaticamente ao Telegram (essencial para tracking de anúncios)
                  </span>
                </label>
              </div>

              {/* 2. Foto da Modelo */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Foto da Modelo de IA
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0 shadow">
                    <Image
                      src={config.photoUrl}
                      alt="Modelo Preview"
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-blue-400" />
                      <span>{uploading ? "Enviando foto..." : "Fazer Upload de Nova Foto"}</span>
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
                        className="flex-1 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Badge Superior</label>
                    <input
                      type="text"
                      value={config.badgeText}
                      onChange={(e) => setConfig({ ...config, badgeText: e.target.value })}
                      placeholder="Online agora • VIP"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <span className="block text-xs text-zinc-400 mb-2">Paletas Prontas:</span>
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                          config.buttonBgColor === preset.bg
                            ? "border-white ring-2 ring-blue-500"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                        style={{ backgroundColor: preset.bg, color: preset.text }}
                      >
                        <span className="drop-shadow-sm font-semibold">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor Customizado Hexadecimal */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Cor de Fundo do Botão</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config.buttonBgColor}
                        onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                        className="w-9 h-9 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={config.buttonBgColor}
                        onChange={(e) => setConfig({ ...config, buttonBgColor: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
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
                        className="w-9 h-9 rounded-lg border border-zinc-700 cursor-pointer bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={config.buttonTextColor}
                        onChange={(e) => setConfig({ ...config, buttonTextColor: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Efeito Glow / Pulso */}
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={config.buttonGlow}
                    onChange={(e) => setConfig({ ...config, buttonGlow: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 bg-zinc-950 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-300">
                    Ativar animação de pulso e brilho contínuo no botão (Aumenta o CTR em 35%)
                  </span>
                </label>
              </div>
            </div>

            {/* Simulador Mobile em Tempo Real (Preview ao Vivo) */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="sticky top-24 w-full max-w-[340px]">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    Preview ao Vivo (Celular)
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium">● Atualização Instantânea</span>
                </div>

                {/* Moldura do Smartphone */}
                <div className="relative w-full aspect-[9/18] max-h-[640px] rounded-[42px] border-[10px] border-zinc-800 bg-black overflow-hidden shadow-2xl ring-1 ring-white/10 flex flex-col justify-between">
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-zinc-900 rounded-full z-30" />

                  {/* Foto de Fundo da Modelo */}
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
                    {config.showBadge ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                        <span>{config.badgeText}</span>
                      </div>
                    ) : <div />}
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

        {/* ================= ABA 3: PIXELS & CONFIGURAÇÕES ================= */}
        {activeTab === "settings" && config && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Status do Supabase */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Conectado ao Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Modo Local / Aguardando Chaves
                  </span>
                )}
              </div>

              {supabaseStatus?.connected ? (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-xs space-y-2">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>URL do Projeto Supabase:</span>
                    <span className="font-mono text-emerald-400">{supabaseStatus.url}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span>Total de Acessos Gravados no PostgreSQL:</span>
                    <span className="font-bold text-white">{supabaseStatus.visitsCount} registros</span>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-xs space-y-2 text-zinc-400">
                  <p>
                    {supabaseStatus?.message ||
                      "Para vincular o Supabase, defina as variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Vercel ou no .env.local."}
                  </p>
                  <p className="text-zinc-500">
                    O script SQL completo está salvo na pasta <code className="text-zinc-300">supabase/schema.sql</code> para ser executado no SQL Editor do seu projeto Supabase.
                  </p>
                </div>
              )}
            </div>

            {/* Pixels de Rastreamento */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
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
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-[0.98]"
                  >
                    {saving ? "Salvando..." : "Salvar Pixels"}
                  </button>
                </div>
              </div>
            </div>

            {/* Senha de Acesso do Admin */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md active:scale-[0.98]"
                  >
                    Atualizar Senha
                  </button>
                </div>
              </div>
            </div>

            {/* Zona de Perigo: Zerar Métricas */}
            <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-6 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Zona de Limpeza de Dados
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Deseja zerar os acessos e cliques de teste antes de iniciar o tráfego oficial?
                </p>
              </div>

              <button
                onClick={handleResetStats}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-xl text-xs font-semibold transition-colors"
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
