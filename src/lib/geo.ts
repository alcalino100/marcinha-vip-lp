export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string; // UF normalizada (ex: SP, RJ, MG)
  city: string;
}

export const BRAZIL_STATES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export function normalizeBrazilUF(input: string): string {
  if (!input) return "";
  const cleaned = input.trim().toUpperCase();

  // Se já for UF de 2 letras
  if (BRAZIL_STATES[cleaned]) {
    return cleaned;
  }

  // Normalização por nome do estado
  const normalized = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const [uf, name] of Object.entries(BRAZIL_STATES)) {
    const nameNorm = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalized.includes(nameNorm) || nameNorm.includes(normalized)) {
      return uf;
    }
  }

  return cleaned.length === 2 ? cleaned : "SP";
}

const geoCache = new Map<string, GeoLocation>();

export async function lookupGeo(ip: string, headers?: Headers): Promise<GeoLocation> {
  // 1. Checa headers comuns de proxies como Vercel ou Cloudflare
  if (headers) {
    const cfCountry = headers.get("cf-ipcountry");
    const cfCity = headers.get("cf-ipcity");
    const vercelCountry = headers.get("x-vercel-ip-country");
    const vercelCity = headers.get("x-vercel-ip-city");
    const vercelRegion = headers.get("x-vercel-ip-country-region");

    if (cfCountry || vercelCountry) {
      const uf = normalizeBrazilUF(vercelRegion || "SP");
      return {
        ip,
        country: vercelCountry === "BR" || cfCountry === "BR" ? "Brasil" : (vercelCountry || cfCountry || "Desconhecido"),
        countryCode: vercelCountry || cfCountry || "BR",
        region: uf,
        city: vercelCity || cfCity || "São Paulo",
      };
    }
  }

  // 2. Se for IP local ou privado
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return {
      ip: ip || "127.0.0.1",
      country: "Brasil",
      countryCode: "BR",
      region: "SP",
      city: "São Paulo (Local)",
    };
  }

  // 3. Checa cache
  if (geoCache.has(ip)) {
    return geoCache.get(ip)!;
  }

  // 4. Consulta serviço gratuito de geolocalização com timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const uf = normalizeBrazilUF(data.region || data.regionName || "SP");
        const geo: GeoLocation = {
          ip,
          country: data.country || "Brasil",
          countryCode: data.countryCode || "BR",
          region: uf,
          city: data.city || "",
        };
        geoCache.set(ip, geo);
        return geo;
      }
    }
  } catch {
    // Falha silenciosa
  }

  return {
    ip,
    country: "Brasil",
    countryCode: "BR",
    region: "SP",
    city: "Desconhecido",
  };
}
