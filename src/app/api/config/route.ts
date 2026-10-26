import { NextResponse } from "next/server";
import { getConfigAsync } from "@/lib/db";

export async function GET() {
  const config = await getConfigAsync();
  
  // Retorna apenas dados públicos (sem a senha de admin)
  const { adminPassword, ...publicConfig } = config;

  return NextResponse.json(publicConfig, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
