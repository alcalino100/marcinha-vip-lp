export interface UADetectionResult {
  device: "Mobile" | "Desktop" | "Tablet";
  os: string;
  browser: string;
  isInAppBrowser: boolean;
  inAppName?: string;
}

export function parseUserAgent(uaString: string): UADetectionResult {
  const ua = uaString.toLowerCase();

  // 1. Detect In-App Browsers
  let isInAppBrowser = false;
  let inAppName: string | undefined = undefined;

  if (ua.includes("instagram")) {
    isInAppBrowser = true;
    inAppName = "Instagram";
  } else if (ua.includes("bytedance") || ua.includes("tiktok") || ua.includes("musical_ly")) {
    isInAppBrowser = true;
    inAppName = "TikTok";
  } else if (ua.includes("fban") || ua.includes("fbav")) {
    isInAppBrowser = true;
    inAppName = "Facebook";
  } else if (ua.includes("telegram")) {
    isInAppBrowser = true;
    inAppName = "Telegram";
  } else if (ua.includes("whatsapp")) {
    isInAppBrowser = true;
    inAppName = "WhatsApp";
  } else if (ua.includes("twitter")) {
    isInAppBrowser = true;
    inAppName = "Twitter / X";
  } else if (ua.includes("threads")) {
    isInAppBrowser = true;
    inAppName = "Threads";
  }

  // 2. Detect Device
  let device: "Mobile" | "Desktop" | "Tablet" = "Desktop";
  if (/(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(ip|ap|wp))))/.test(ua)) {
    device = "Tablet";
  } else if (/(mobi|iphone|ipod|android|blackberry|iemobile|opera mini|mobile)/.test(ua)) {
    device = "Mobile";
  }

  // 3. Detect OS
  let os = "Desconhecido";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    os = "iOS";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("macintosh") || ua.includes("mac os")) {
    os = "macOS";
  } else if (ua.includes("linux")) {
    os = "Linux";
  }

  // 4. Detect Browser
  let browser = inAppName || "Desconhecido";
  if (!inAppName) {
    if (ua.includes("edg/")) {
      browser = "Edge";
    } else if (ua.includes("chrome") && !ua.includes("chromium") && !ua.includes("edg")) {
      browser = "Chrome";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      browser = "Safari";
    } else if (ua.includes("firefox")) {
      browser = "Firefox";
    } else if (ua.includes("opera") || ua.includes("opr/")) {
      browser = "Opera";
    }
  }

  return {
    device,
    os,
    browser,
    isInAppBrowser,
    inAppName,
  };
}
