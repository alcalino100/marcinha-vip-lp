import fs from "fs";
import path from "path";
import { LandingConfig, VisitEvent, DatabaseSchema } from "./types";

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
  showAdminShortcut: true,
  adminPassword: "marcinha2026",
  facebookPixelId: "",
  googleAnalyticsId: "",
  tiktokPixelId: "",
  updatedAt: new Date().toISOString(),
};

let memoryDb: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }

  ensureDataDir();

  if (!fs.existsSync(DB_FILE)) {
    // Se o banco ainda não existe em /tmp (ex: Vercel), tenta carregar do arquivo do repositório
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
    console.error("Erro ao ler db.json, reinicializando...", error);
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
  } catch (err) {
    console.error("Erro ao gravar db.json:", err);
  }
}

export function getConfig(): LandingConfig {
  const db = getDatabase();
  return db.config;
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

export function recordVisit(event: Omit<VisitEvent, "clicked" | "clickedAt">): VisitEvent {
  const db = getDatabase();
  const visit: VisitEvent = {
    ...event,
    clicked: false,
  };

  // Mantém no máximo os últimos 5000 acessos para performance
  if (db.visits.length > 5000) {
    db.visits = db.visits.slice(-4000);
  }

  db.visits.unshift(visit);
  saveDatabase(db);
  return visit;
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

  // Se não encontrar visitId específico ou não foi enviado, marca a última visita não clicada ou adiciona evento
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

export function resetStats(): void {
  const db = getDatabase();
  db.visits = [];
  saveDatabase(db);
}
