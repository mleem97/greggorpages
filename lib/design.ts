import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface ErrorInfo {
  title: string;
  message: string;
}

export interface KumaIntegrationConfig {
  enabled: boolean;
  baseUrl: string;
  statusPageSlug: string;
  linkToStatusPage: string;
  showLink: boolean;
  apiKey?: string;
  monitorId?: string | number;
}

export interface DesignConfig {
  colors: Record<string, string>;
  fonts: Record<string, string>;
  shadows: Record<string, string>;
  effects: {
    noiseOpacity: number;
    noiseImageUrl: string;
    glassCardBackground: string;
    glassCardBorder: string;
    heroGlow: string;
  };
  branding: {
    brandName: string;
    incidentLabel: string;
    serviceStatus: string;
    footerText: string;
    returnHome: string;
    reloadPage: string;
  };
  errors: Record<string, ErrorInfo>;
  integrations: {
    uptimeKuma: KumaIntegrationConfig;
  };
}

const DEFAULT_CONFIG: DesignConfig = {
  colors: {
    primary: "#8aebff",
    primaryContainer: "#22d3ee",
    onPrimary: "#051424",
    secondary: "#4de082",
    secondaryContainer: "#00b55d",
    onSecondary: "#051424",
    tertiary: "#d5dcf6",
    tertiaryContainer: "#b9c0da",
    onTertiary: "#051424",
    background: "#051424",
    onBackground: "#d4e4fa",
    surface: "#051424",
    onSurface: "#d4e4fa",
    surfaceVariant: "#273647",
    onSurfaceVariant: "#bbc9cd",
    surfaceContainer: "#122131",
    surfaceContainerLow: "#0d1c2d",
    surfaceContainerLowest: "#010f1f",
    surfaceContainerHigh: "#1c2b3c",
    surfaceContainerHighest: "#273647",
    inverseSurface: "#d4e4fa",
    inverseOnSurface: "#233143",
    outline: "#859397",
    outlineVariant: "#3c494c",
    error: "#ffb4ab",
    errorContainer: "#93000a",
    errorDim: "#93000a",
    onError: "#690005",
  },
  fonts: {
    headline: '"Space Grotesk", sans-serif',
    body: '"Inter", sans-serif',
    mono: '"JetBrains Mono", monospace',
  },
  shadows: {
    ambientGlow: "0 0 24px -2px rgba(138, 235, 255, 0.12)",
    ambientGreen: "0 0 24px -2px rgba(77, 224, 130, 0.12)",
    consoleGlow:
      "0 0 0 1px rgba(138, 235, 255, 0.15), 0 0 32px -4px rgba(138, 235, 255, 0.08)",
    alertGlow: "0 0 48px -4px rgba(138, 235, 255, 0.25)",
  },
  effects: {
    noiseOpacity: 0.2,
    noiseImageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBo_f23WK3YkU7kOJXXGo9wWnI2T0P4H9YQ00HGnsrztdAl6nVVQuFXw4nQ1Q-xbQGHP5T7VD1hzrlPmvHQdAc7WuLl7fPGSYJKNLLx9uy_IkPrZfuDqjro6k9rbnV2by9RzBBxe1AGGExEXWzuwATQ4tLUKtU0qAG6gO46IZOVGca1O1jldF_PENt_aQzHclIWJPsFjuASbnTfLkM_1SDSK-aPrjEbqQnH3fHEpCKfKm11SWVMuPBZoWbq_GIm72yvlkkjMmWK3zCd",
    glassCardBackground: "rgba(18, 33, 49, 0.8)",
    glassCardBorder: "1px solid rgba(133, 147, 151, 0.08)",
    heroGlow: "0 0 80px -20px rgba(138, 235, 255, 0.12)",
  },
  branding: {
    brandName: "System",
    incidentLabel: "Incident",
    serviceStatus: "Service Status: Disrupted",
    footerText: "Infrastructure Response",
    returnHome: "Return Home",
    reloadPage: "Reload Page",
  },
  errors: {
    "400": {
      title: "Bad Request",
      message: "The server could not understand the request due to invalid syntax.",
    },
    "401": {
      title: "Unauthorized",
      message: "Authentication is required and has failed or has not yet been provided.",
    },
    "403": {
      title: "Forbidden",
      message: "Access to the requested resource is strictly denied.",
    },
    "404": {
      title: "Not Found",
      message: "The requested resource could not be located on this server.",
    },
    "500": {
      title: "Internal Server Error",
      message: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
    },
    "502": {
      title: "Bad Gateway",
      message: "The server received an invalid response from the upstream server.",
    },
    "503": {
      title: "Service Unavailable",
      message: "The server is currently unable to handle the request.",
    },
    "504": {
      title: "Gateway Timeout",
      message: "The gateway timed out while waiting for a response.",
    },
  },
  integrations: {
    uptimeKuma: {
      enabled: false,
      baseUrl: "https://status.example.com",
      statusPageSlug: "default",
      linkToStatusPage: "https://status.example.com",
      showLink: true,
      apiKey: "",
      monitorId: "",
    },
  },
};

function mergeDeep<T>(target: T, source: Partial<T>): T {
  const output = { ...target } as any;
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      output[key] = mergeDeep(target[key as keyof T] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output as T;
}

function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function loadDesignConfig(): DesignConfig {
  const configPath = join(process.cwd(), "design.json");
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<DesignConfig>;
      return mergeDeep(DEFAULT_CONFIG, parsed);
    } catch (e) {
      console.error("Failed to load design.json, using defaults:", e);
    }
  }
  return DEFAULT_CONFIG;
}

export function generateDesignCSS(config: DesignConfig): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(config.colors)) {
    lines.push(`  --color-${toKebabCase(key)}: ${value} !important;`);
  }

  for (const [key, value] of Object.entries(config.fonts)) {
    lines.push(`  --font-${toKebabCase(key)}: ${value} !important;`);
  }

  for (const [key, value] of Object.entries(config.shadows)) {
    lines.push(`  --shadow-${toKebabCase(key)}: ${value} !important;`);
  }

  lines.push(`  --noise-opacity: ${config.effects.noiseOpacity} !important;`);
  lines.push(
    `  --noise-image-url: url('${config.effects.noiseImageUrl}') !important;`
  );
  lines.push(
    `  --glass-card-bg: ${config.effects.glassCardBackground} !important;`
  );
  lines.push(
    `  --glass-card-border: ${config.effects.glassCardBorder} !important;`
  );
  lines.push(`  --hero-glow: ${config.effects.heroGlow} !important;`);

  return `body {\n${lines.join("\n")}\n}`;
}

export function generateGoogleFontsUrl(config: DesignConfig): string {
  const families: string[] = [];

  const extractFamily = (fontString: string) => {
    const match = fontString.match(/"([^"]+)"/);
    return match ? match[1] : fontString.split(",")[0].trim();
  };

  const headline = extractFamily(config.fonts.headline);
  const body = extractFamily(config.fonts.body);
  const mono = extractFamily(config.fonts.mono);

  if (headline)
    families.push(`${encodeURIComponent(headline)}:wght@400;500;600;700`);
  if (body)
    families.push(`${encodeURIComponent(body)}:wght@400;500;600;700`);
  if (mono) families.push(`${encodeURIComponent(mono)}:wght@400;500`);

  return `https://fonts.googleapis.com/css2?family=${families.join(
    "&family="
  )}&display=swap`;
}
