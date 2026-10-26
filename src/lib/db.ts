import fs from "fs";
import path from "path";
import { LandingConfig, VisitEvent, DatabaseSchema } from "./types";
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  saveSupabaseConfig,
  insertSupabaseVisit,
  updateSupabaseClick,
  getSupabaseVisits,
  resetSupabaseVisits,
} from "./supabase";

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join("/tmp", "marcinha_data") : path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const REPO_SEED_FILE = path.join(process.cwd(), "data", "db.json");

export const DEFAULT_CONFIG: LandingConfig = {
  telegramUrl: "https://t.me/MarcinhaVip18_bot",
  forwardUtms: true,
  photoUrl: "/uploads/model-default.jpg",
  modelName: "Marcinha",
  badgeText: "Online agora • VIP",
  showBadge: true,
  buttonText: "Acessar agora",
  buttonSubtext: "",
  showButtonSubtext: false,
  themePreset: "telegram-blue",
  buttonBgColor: "#229ED9",
  buttonTextColor: "#ffffff",
  buttonGlow: true,
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
          visits: Array.isArray(seedParsed.visits) ? seedParsed.visits : [],
        };
        saveDatabase(memoryDb);
        return memoryDb;
      } catch {}
    }

    memoryDb = {
      config: { ...DEFAULT_CONFIG },
      visits: [],
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
    };
    return memoryDb;
  } catch (error) {
    memoryDb = {
      config: { ...DEFAULT_CONFIG },
      visits: [],
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
    const supabaseConfig = await getSupabaseConfig();
    if (supabaseConfig) {
      if (memoryDb) memoryDb.config = supabaseConfig;
      return supabaseConfig;
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
    await saveSupabaseConfig(partial);
  }

  // Atualiza cache local
  return updateConfig(partial);
}

export function updateConfig(partial: Partial<LandingConfig>): LandingConfig {
  const db = getDatabase();
  db.config = {
    ...db.config,
    ...partial,
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
    await insertSupabaseVisit(event);
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
    recordedInSupabase = await updateSupabaseClick(visitId);
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
    const visits = await getSupabaseVisits();
    if (visits.length > 0) {
      return visits;
    }
  }

  return getDatabase().visits;
}

export async function resetStatsAsync(): Promise<void> {
  if (isSupabaseConfigured()) {
    await resetSupabaseVisits();
  }
  resetStats();
}

export function resetStats(): void {
  const db = getDatabase();
  db.visits = [];
  saveDatabase(db);
}
