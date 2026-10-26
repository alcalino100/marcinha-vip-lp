import fs from "fs";
import path from "path";
import { LandingConfig, VisitEvent, OrderEvent, DatabaseSchema } from "./types";
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  insertSupabaseVisit,
  updateSupabaseClick,
  getSupabaseVisits,
  resetSupabaseVisits,
  upsertSupabaseOrder,
  getSupabaseOrders,
  resetSupabaseOrders,
} from "./supabase";

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join("/tmp", "marcinha_data") : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const REPO_SEED_FILE = path.join(process.cwd(), "data", "db.json");

export const DEFAULT_CONFIG: LandingConfig = {
  telegramUrl: "https://t.me/MarcinhaVip18_bot",
  forwardUtms: true,
  photoUrl: "/uploads/model-default.jpg",
  savedPhotos: ["/uploads/model-default.jpg"],
  modelName: "Marcinha",
  badgeText: "Online agora • VIP",
  showBadge: true,
  hookHeadline: "Conteúdo exclusivo liberado no Telegram",
  showHookHeadline: false,
  urgencyBadge: "🔥 142 pessoas online agora",
  showUrgencyBadge: false,
  buttonText: "Acessar agora",
  buttonSubtext: "",
  showButtonSubtext: false,
  ctaIcon: "telegram",
  themePreset: "telegram-blue",
  buttonBgColor: "#229ED9",
  buttonTextColor: "#ffffff",
  buttonGlow: true,
  overlayStyle: "cinematic",
  footerDisclaimer: "Acesso 100% seguro e anônimo • +18",
  showFooterDisclaimer: true,
  showAdminShortcut: false, // Oculto na LP pública
  adminPassword: "marcinha2026",
  facebookPixelId: "",
  googleAnalyticsId: "",
  tiktokPixelId: "",
  updatedAt: new Date().toISOString(),
};

let memoryDb: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

export function getDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  ensureDataDir();

  if (!fs.existsSync(DB_FILE)) {
    if (fs.existsSync(REPO_SEED_FILE)) {
      try {
        const seedRaw = fs.readFileSync(REPO_SEED_FILE, "utf-8");
        const seedParsed = JSON.parse(seedRaw);
        memoryDb = {
          config: { ...DEFAULT_CONFIG, ...(seedParsed.config || {}) },
          visits: [], // Visitas sempre iniciam vazias
          orders: [],
        };
        saveDatabase(memoryDb);
        return memoryDb;
      } catch {}
    }

    memoryDb = {
      config: { ...DEFAULT_CONFIG },
      visits: [],
      orders: [],
    };
    saveDatabase(memoryDb);
    return memoryDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    memoryDb = {
      config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
      visits: Array.isArray(parsed.visits) ? parsed.visits : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
    return memoryDb;
  } catch (error) {
    memoryDb = {
      config: { ...DEFAULT_CONFIG },
      visits: [],
      orders: [],
    };
    return memoryDb;
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  ensureDataDir();
  memoryDb = data;
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {}
}

// ==========================================
// MÉTODOS HÍBRIDOS (SUPABASE + LOCAL CACHE)
// ==========================================

export async function getConfigAsync(): Promise<LandingConfig> {
  if (isSupabaseConfigured()) {
    try {
      const supabaseConfig = await getSupabaseConfig();
      if (supabaseConfig) {
        if (memoryDb) memoryDb.config = supabaseConfig;
        return supabaseConfig;
      }
    } catch (e) {
      console.error("Erro ao carregar config Supabase:", e);
    }
  }

  return getConfig();
}

export function getConfig(): LandingConfig {
  const db = getDatabase();
  return db.config;
}

export async function updateConfigAsync(partial: Partial<LandingConfig>): Promise<LandingConfig> {
  // Salva no Supabase se configurado
  if (isSupabaseConfigured()) {
    try {
      await saveSupabaseConfig(partial);
    } catch (e) {
      console.error("Erro ao gravar config no Supabase:", e);
    }
  }

  // Atualiza cache local
  return updateConfig(partial);
}

export function updateConfig(partial: Partial<LandingConfig>): LandingConfig {
  const db = getDatabase();
  const currentSaved = Array.isArray(db.config.savedPhotos) ? db.config.savedPhotos : ["/uploads/model-default.jpg"];
  let newSaved = [...currentSaved];

  if (partial.photoUrl && !newSaved.includes(partial.photoUrl)) {
    newSaved.unshift(partial.photoUrl);
    if (newSaved.length > 20) newSaved = newSaved.slice(0, 20); // Mantém até 20 fotos salvas
  }

  db.config = {
    ...db.config,
    ...partial,
    savedPhotos: partial.savedPhotos || newSaved,
    updatedAt: new Date().toISOString(),
  };
  saveDatabase(db);
  return db.config;
}

export async function recordVisitAsync(event: Omit<VisitEvent, "clicked" | "clickedAt">): Promise<VisitEvent> {
  const visit: VisitEvent = {
    ...event,
    clicked: false,
  };

  if (isSupabaseConfigured()) {
    try {
      await insertSupabaseVisit(event);
    } catch (e) {
      console.error("Erro ao inserir visita no Supabase:", e);
    }
  }

  // Mantém no banco local também
  const db = getDatabase();
  if (db.visits.length > 5000) {
    db.visits = db.visits.slice(-4000);
  }
  db.visits.unshift(visit);
  saveDatabase(db);

  return visit;
}

export async function recordClickAsync(visitId?: string): Promise<boolean> {
  let recordedInSupabase = false;

  if (isSupabaseConfigured()) {
    try {
      recordedInSupabase = await updateSupabaseClick(visitId);
    } catch (e) {
      console.error("Erro ao gravar clique no Supabase:", e);
    }
  }

  const recordedLocal = recordClick(visitId);
  return recordedInSupabase || recordedLocal;
}

export function recordClick(visitId?: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (visitId) {
    const found = db.visits.find((v) => v.id === visitId);
    if (found) {
      found.clicked = true;
      found.clickedAt = now;
      saveDatabase(db);
      return true;
    }
  }

  if (db.visits.length > 0) {
    const latest = db.visits.find((v) => !v.clicked);
    if (latest) {
      latest.clicked = true;
      latest.clickedAt = now;
      saveDatabase(db);
      return true;
    }
  }

  return false;
}

export async function getVisitsAsync(): Promise<VisitEvent[]> {
  if (isSupabaseConfigured()) {
    try {
      const visits = await getSupabaseVisits();
      // Retorna DIRETAMENTE do Supabase, mesmo se estiver vazio []
      return visits;
    } catch (err) {
      console.error("Falha ao consultar visitas do Supabase:", err);
    }
  }

  return getDatabase().visits;
}

export async function resetStatsAsync(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await resetSupabaseVisits();
    } catch (e) {
      console.error("Erro ao zerar visitas no Supabase:", e);
    }
  }
  resetStats();
}

export function resetStats(): void {
  const db = getDatabase();
  db.visits = [];
  saveDatabase(db);
}

// ==========================================
// VENDAS & WEBHOOKS FIREBOT
// ==========================================
export async function upsertOrderAsync(order: OrderEvent): Promise<OrderEvent> {
  if (isSupabaseConfigured()) {
    try {
      await upsertSupabaseOrder(order);
    } catch (e) {
      console.error("Erro ao salvar pedido no Supabase:", e);
    }
  }

  const db = getDatabase();
  if (!Array.isArray(db.orders)) {
    db.orders = [];
  }

  const existingIndex = db.orders.findIndex((o) => o.id === order.id);
  if (existingIndex >= 0) {
    db.orders[existingIndex] = {
      ...db.orders[existingIndex],
      ...order,
      updatedAt: new Date().toISOString(),
    };
  } else {
    db.orders.unshift(order);
    if (db.orders.length > 5000) {
      db.orders = db.orders.slice(0, 4000);
    }
  }

  saveDatabase(db);
  return order;
}

export async function getOrdersAsync(): Promise<OrderEvent[]> {
  if (isSupabaseConfigured()) {
    try {
      const orders = await getSupabaseOrders();
      return orders;
    } catch (err) {
      console.error("Falha ao buscar pedidos do Supabase:", err);
    }
  }

  const db = getDatabase();
  return Array.isArray(db.orders) ? db.orders : [];
}

export async function resetOrdersAsync(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      await resetSupabaseOrders();
    } catch (e) {
      console.error("Erro ao zerar pedidos no Supabase:", e);
    }
  }

  const db = getDatabase();
  db.orders = [];
  saveDatabase(db);
}
