export interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
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
      return {
        ip,
        country: vercelCountry === "BR" || cfCountry === "BR" ? "Brasil" : (vercelCountry || cfCountry || "Desconhecido"),
        countryCode: vercelCountry || cfCountry || "BR",
        region: vercelRegion || "SP",
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

    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.status === "success") {
        const geo: GeoLocation = {
          ip,
          country: data.country || "Brasil",
          countryCode: data.countryCode || "BR",
          region: data.regionName || "",
          city: data.city || "",
        };
        geoCache.set(ip, geo);
        return geo;
      }
    }
  } catch {
    // Falha silenciosa em caso de offline/timeout
  }

  return {
    ip,
    country: "Brasil",
    countryCode: "BR",
    region: "",
    city: "Desconhecido",
  };
}
