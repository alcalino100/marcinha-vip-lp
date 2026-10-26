import { NextRequest } from "next/server";
import { getConfig } from "./db";

export function checkAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const config = getConfig();
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // O token é o base64 da senha ou a própria senha
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    if (decoded === config.adminPassword) return true;
  } catch {}

  return token === config.adminPassword;
}
