"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  PALETTE_THEME_OPTIONS,
  generatePalette,
  makeRandomSeed,
  type HslColor,
  type PaletteColor,
  type PaletteTheme
} from "@/lib/palette";
import { renderBamInspiredPreview } from "@/lib/bam-preview";

const SWATCH_COUNT = 5;
const MAX_FAVORITES = 10;
const FAVORITES_KEY = "palette-favorites-v1";
const CUSTOM_THEMES_KEY = "palette-custom-themes-v1";
const SSR_SEED = 421_337_420;
const AUTO_THEME_ID = "auto";
const MASTER_SEED_PREFIX = "PLT1";
const VARIANT_COUNT = 12;
const MAX_CONTRAST_TARGET = 7;
const AA_TEXT_TARGET = 4.5;
const CUSTOM_THEME_PREFIX = "custom";

const EMPTY_LOCKS = Array.from({ length: SWATCH_COUNT }, () => false);
const makeUnlockedColors = (): Array<HslColor | null> =>
  Array.from({ length: SWATCH_COUNT }, () => null);

type MasterSeedPayload = {
  v: 1;
  seed: number;
  themeId: string;
  selectedThemeId: string;
  locks: boolean[];
  palette: PaletteColor[];
};

type VariantSnapshot = {
  seed: number;
  basePalette: PaletteColor[];
  locks: boolean[];
  themeId: string;
  themeName: string;
};

const serializePalette = (palette: PaletteColor[]): string =>
  palette.map((color) => color.hex).join(",");

const swapIndices = <T,>(entries: T[], indexA: number, indexB: number): T[] => {
  const next = [...entries];
  [next[indexA], next[indexB]] = [next[indexB]!, next[indexA]!];
  return next;
};

const isValidPaletteColor = (value: unknown): value is PaletteColor => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PaletteColor>;
  return (
    typeof candidate.hex === "string" &&
    candidate.hex.startsWith("#") &&
    !!candidate.hsl &&
    typeof candidate.hsl.h === "number" &&
    typeof candidate.hsl.s === "number" &&
    typeof candidate.hsl.l === "number"
  );
};

const isValidFavorites = (value: unknown): value is PaletteColor[][] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === SWATCH_COUNT &&
      entry.every(isValidPaletteColor)
  );

const normalizeHex = (value: string): string | null => {
  const normalized = value.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return null;
  }

  return `#${expanded.toUpperCase()}`;
};

const sanitizeCustomThemeId = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${CUSTOM_THEME_PREFIX}-${slug || "palette"}`;
};

const buildCustomThemeId = (name: string, existingIds: Set<string>): string => {
  const base = sanitizeCustomThemeId(name);
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const normalizeCustomTheme = (value: unknown): PaletteTheme | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<PaletteTheme>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string") {
    return null;
  }
  if (!Array.isArray(candidate.colors) || candidate.colors.length < SWATCH_COUNT) {
    return null;
  }

  const colors = candidate.colors
    .map((entry) => (typeof entry === "string" ? normalizeHex(entry) : null))
    .filter((entry): entry is string => entry !== null)
    .slice(0, SWATCH_COUNT);

  if (colors.length !== SWATCH_COUNT) {
    return null;
  }

  return {
    id: sanitizeCustomThemeId(candidate.id),
    name: candidate.name.trim().slice(0, 40) || "Custom Palette",
    colors
  };
};

const parseCustomThemes = (value: unknown): PaletteTheme[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const usedIds = new Set(PALETTE_THEME_OPTIONS.map((entry) => entry.id));
  const parsed: PaletteTheme[] = [];
  for (const item of value) {
    const theme = normalizeCustomTheme(item);
    if (!theme || usedIds.has(theme.id)) continue;
    usedIds.add(theme.id);
    parsed.push(theme);
  }

  return parsed;
};

const getInitialPalette = (seed: number, customThemes: PaletteTheme[] = []) =>
  generatePalette(seed, makeUnlockedColors(), undefined, customThemes);

const isValidMasterSeedPayload = (value: unknown): value is MasterSeedPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<MasterSeedPayload>;
  return (
    payload.v === 1 &&
    typeof payload.seed === "number" &&
    Number.isFinite(payload.seed) &&
    payload.seed > 0 &&
    typeof payload.themeId === "string" &&
    typeof payload.selectedThemeId === "string" &&
    Array.isArray(payload.locks) &&
    payload.locks.length === SWATCH_COUNT &&
    payload.locks.every((entry) => typeof entry === "boolean") &&
    Array.isArray(payload.palette) &&
    payload.palette.length === SWATCH_COUNT &&
    payload.palette.every(isValidPaletteColor)
  );
};

const base64UrlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlDecode = (input: string): string | null => {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
};

const buildMasterSeed = (payload: MasterSeedPayload): string =>
  `${MASTER_SEED_PREFIX}.${base64UrlEncode(JSON.stringify(payload))}`;

const parseMasterSeed = (value: string): MasterSeedPayload | null => {
  const [prefix, body] = value.trim().split(".", 2);
  if (prefix !== MASTER_SEED_PREFIX || !body) {
    return null;
  }

  const decoded = base64UrlDecode(body);
  if (!decoded) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(decoded);
    return isValidMasterSeedPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const deriveIterationSeed = (seed: number): number => {
  const mixed = (Math.imul(seed ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0;
  const bounded = mixed % 2_147_483_647;
  return bounded > 0 ? bounded : 1_337_421;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return [0, 0, 0];
  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16)
  ];
};

const toRelativeLuminance = (hex: string): number => {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
};

const getContrastRatio = (hexA: string, hexB: string): number => {
  const lA = toRelativeLuminance(hexA);
  const lB = toRelativeLuminance(hexB);
  const light = Math.max(lA, lB);
  const dark = Math.min(lA, lB);
  return (light + 0.05) / (dark + 0.05);
};

const getContrastHeat = (ratio: number): string => {
  const clamped = Math.max(1, Math.min(MAX_CONTRAST_TARGET, ratio));
  const normalized = (clamped - 1) / (MAX_CONTRAST_TARGET - 1);
  const hue = 6 + normalized * 114;
  return `hsl(${hue} 72% 35%)`;
};

const getReadableTextColor = (hex: string): string =>
  toRelativeLuminance(hex) > 0.44 ? "#111317" : "#F8FAFC";

const getHueSpread = (hues: number[]): number => {
  if (hues.length < 2) return 0;
  const sorted = [...hues].sort((a, b) => a - b);
  let largestGap = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index] ?? 0;
    const next =
      index === sorted.length - 1 ? (sorted[0] ?? 0) + 360 : (sorted[index + 1] ?? 0);
    largestGap = Math.max(largestGap, next - current);
  }
  return 360 - largestGap;
};

const LockClosedIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockOpenIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="M17 8a5 5 0 0 0-10 0m1 3h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="m5 12 4.2 4.1L19 7"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronDownIcon = ({ rotated = false }: { rotated?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-4 w-4 transition-transform ${rotated ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
  >
    <path
      d="m6 9 6 6 6-6"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type ShowcaseScene = "frontend" | "commerce" | "mobile" | "art";
type ArtAspect = "square" | "portrait" | "landscape";

const SHOWCASE_SCENES: Array<{ id: ShowcaseScene; label: string }> = [
  { id: "frontend", label: "Front-end Design" },
  { id: "commerce", label: "E-commerce Shop" },
  { id: "mobile", label: "Mobile App" },
  { id: "art", label: "Mini Artwork Mockup" }
];
const MINI_ARTWORK_COUNT = 4;
const PIXEL_GARMENT_MAP = [
  "0011111100",
  "0111111110",
  "1111111111",
  "1111111111",
  "0111111110",
  "0011111100",
  "0011111100",
  "0011111100",
  "0011111100",
  "0001111000",
  "0001111000",
  "0000110000"
];

const toneMaterial = [
  "Lacquer",
  "Mineral",
  "Smoke",
  "Ink",
  "Pigment",
  "Velour",
  "Stone",
  "Alloy",
  "Glass",
  "Dust"
];

const getHueFamily = (hue: number): string => {
  if (hue < 14 || hue >= 346) return "Crimson";
  if (hue < 32) return "Amber";
  if (hue < 52) return "Ochre";
  if (hue < 76) return "Lime";
  if (hue < 154) return "Jade";
  if (hue < 196) return "Aqua";
  if (hue < 244) return "Cobalt";
  if (hue < 286) return "Violet";
  if (hue < 326) return "Magenta";
  return "Rose";
};

const getValueTone = (saturation: number, lightness: number): string => {
  if (lightness > 80) return "Porcelain";
  if (lightness < 20) return "Nocturne";
  if (saturation < 28) return "Muted";
  if (saturation > 78) return "Vivid";
  if (saturation > 60 && lightness > 62) return "Luminous";
  if (lightness < 34) return "Deep";
  return "Balanced";
};

const toneName = (color: HslColor, index: number, seed: number): string => {
  let hash = Math.imul(Math.round(color.h * 10) + index * 193, 2654435761);
  hash ^= Math.imul(Math.round(color.s * 10) + seed, 2246822519);
  hash ^= Math.imul(Math.round(color.l * 10) + 17, 3266489917);
  hash ^= hash >>> 16;
  const material = toneMaterial[Math.abs(hash) % toneMaterial.length] ?? "Lacquer";
  const family = getHueFamily(color.h);
  const value = getValueTone(color.s, color.l);
  return `${value} ${family} ${material}`;
};

type MetricTone = "strong" | "balanced" | "weak";

const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  strong: "text-emerald-300",
  balanced: "text-amber-200",
  weak: "text-rose-300"
};

const describeHueVariety = (hueSpread: number): { label: string; detail: string; tone: MetricTone } => {
  if (hueSpread < 110) {
    return {
      label: "Focused",
      detail: "Most colors are from nearby families, so the look stays cohesive.",
      tone: "balanced"
    };
  }
  if (hueSpread < 210) {
    return {
      label: "Balanced",
      detail: "Good spread across the wheel without feeling chaotic.",
      tone: "strong"
    };
  }
  return {
    label: "Wide",
    detail: "Very broad color families, strong visual variety.",
    tone: "balanced"
  };
};

const describeSaturationEnergy = (
  saturationRange: number
): { label: string; detail: string; tone: MetricTone } => {
  if (saturationRange < 24) {
    return {
      label: "Soft",
      detail: "Mostly muted colors, calm and minimal mood.",
      tone: "balanced"
    };
  }
  if (saturationRange < 48) {
    return {
      label: "Mixed",
      detail: "Balanced mix of muted and vivid tones.",
      tone: "strong"
    };
  }
  return {
    label: "Punchy",
    detail: "Strong difference between muted and vivid colors.",
    tone: "strong"
  };
};

const describeLightnessDepth = (
  lightnessRange: number
): { label: string; detail: string; tone: MetricTone } => {
  if (lightnessRange < 24) {
    return {
      label: "Flat",
      detail: "Colors sit in similar brightness, so depth is limited.",
      tone: "weak"
    };
  }
  if (lightnessRange < 42) {
    return {
      label: "Moderate",
      detail: "Clear light/dark differences with controlled contrast.",
      tone: "balanced"
    };
  }
  return {
    label: "Deep",
    detail: "Strong light vs dark separation, good for hierarchy.",
    tone: "strong"
  };
};

const describeReadability = (
  averageContrast: number
): { label: string; detail: string; tone: MetricTone } => {
  if (averageContrast < 3) {
    return {
      label: "Challenging",
      detail: "Many pairings are hard to read as text.",
      tone: "weak"
    };
  }
  if (averageContrast < AA_TEXT_TARGET) {
    return {
      label: "Mixed",
      detail: "Some combinations read well, some need caution.",
      tone: "balanced"
    };
  }
  return {
    label: "Strong",
    detail: "Most combinations are solid for text readability.",
    tone: "strong"
  };
};

const describeAccessibility = (
  aaPassRate: number
): { label: string; detail: string; tone: MetricTone } => {
  if (aaPassRate < 35) {
    return {
      label: "Low Coverage",
      detail: "Only a small set of color pairs are AA-safe for normal text.",
      tone: "weak"
    };
  }
  if (aaPassRate < 70) {
    return {
      label: "Partial Coverage",
      detail: "AA-safe options exist, but pairing choice matters.",
      tone: "balanced"
    };
  }
  return {
    label: "High Coverage",
    detail: "Most pairings can support readable text.",
    tone: "strong"
  };
};

export default function PaletteExplorer() {
  const initialGeneration = getInitialPalette(SSR_SEED);
  const initialCustomThemeColors = initialGeneration.colors.map((entry) => entry.hex);
  const [seed, setSeed] = useState(SSR_SEED);
  const [palette, setPalette] = useState<PaletteColor[]>(() => initialGeneration.colors);
  const [themeId, setThemeId] = useState(initialGeneration.themeId);
  const [themeName, setThemeName] = useState(initialGeneration.themeName);
  const [selectedThemeId, setSelectedThemeId] = useState(AUTO_THEME_ID);
  const [customThemes, setCustomThemes] = useState<PaletteTheme[]>([]);
  const [customThemeName, setCustomThemeName] = useState("");
  const [customThemeColors, setCustomThemeColors] = useState<string[]>(initialCustomThemeColors);
  const [customThemeMessage, setCustomThemeMessage] = useState<string | null>(null);
  const [variantLabOpen, setVariantLabOpen] = useState(true);
  const [showcaseScene, setShowcaseScene] = useState<ShowcaseScene>("frontend");
  const [artAspect, setArtAspect] = useState<ArtAspect>("portrait");
  const [artIteration, setArtIteration] = useState(0);
  const [locks, setLocks] = useState<boolean[]>(() => [...EMPTY_LOCKS]);
  const [variantSnapshot, setVariantSnapshot] = useState<VariantSnapshot>(() => ({
    seed: SSR_SEED,
    basePalette: initialGeneration.colors,
    locks: [...EMPTY_LOCKS],
    themeId: initialGeneration.themeId,
    themeName: initialGeneration.themeName
  }));
  const [favorites, setFavorites] = useState<PaletteColor[][]>([]);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [masterSeedInput, setMasterSeedInput] = useState("");
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const generatingTimeoutRef = useRef<number | null>(null);
  const seedMessageTimeoutRef = useRef<number | null>(null);
  const customThemeMessageTimeoutRef = useRef<number | null>(null);
  const miniArtworkCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  const flashGenerating = (durationMs: number) => {
    setIsGenerating(true);
    if (generatingTimeoutRef.current !== null) {
      window.clearTimeout(generatingTimeoutRef.current);
    }
    generatingTimeoutRef.current = window.setTimeout(() => {
      setIsGenerating(false);
      generatingTimeoutRef.current = null;
    }, durationMs);
  };

  const pushSeedMessage = (message: string) => {
    setSeedMessage(message);
    if (seedMessageTimeoutRef.current !== null) {
      window.clearTimeout(seedMessageTimeoutRef.current);
    }
    seedMessageTimeoutRef.current = window.setTimeout(() => {
      setSeedMessage(null);
      seedMessageTimeoutRef.current = null;
    }, 2200);
  };

  const pushCustomThemeMessage = (message: string) => {
    setCustomThemeMessage(message);
    if (customThemeMessageTimeoutRef.current !== null) {
      window.clearTimeout(customThemeMessageTimeoutRef.current);
    }
    customThemeMessageTimeoutRef.current = window.setTimeout(() => {
      setCustomThemeMessage(null);
      customThemeMessageTimeoutRef.current = null;
    }, 2600);
  };

  useEffect(() => {
    const nextSeed = makeRandomSeed();
    const generated = getInitialPalette(nextSeed);
    setSeed(nextSeed);
    setPalette(generated.colors);
    setThemeId(generated.themeId);
    setThemeName(generated.themeName);
    setVariantSnapshot({
      seed: nextSeed,
      basePalette: generated.colors,
      locks: [...EMPTY_LOCKS],
      themeId: generated.themeId,
      themeName: generated.themeName
    });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (!stored) return;

      const parsed: unknown = JSON.parse(stored);
      if (isValidFavorites(parsed)) {
        setFavorites(parsed.slice(0, MAX_FAVORITES));
      }
    } catch {
      localStorage.removeItem(FAVORITES_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      setCustomThemes(parseCustomThemes(parsed));
    } catch {
      localStorage.removeItem(CUSTOM_THEMES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(
    () => () => {
      if (generatingTimeoutRef.current !== null) {
        window.clearTimeout(generatingTimeoutRef.current);
      }
      if (seedMessageTimeoutRef.current !== null) {
        window.clearTimeout(seedMessageTimeoutRef.current);
      }
      if (customThemeMessageTimeoutRef.current !== null) {
        window.clearTimeout(customThemeMessageTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (showcaseScene !== "art") return;

    let rafId: number | null = null;
    const drawMiniArtworks = () => {
      miniArtworkCanvasRefs.current.forEach((canvas, index) => {
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const width = Math.max(120, Math.floor(canvas.clientWidth));
        const height = Math.max(120, Math.floor(canvas.clientHeight));
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const mixedSeed =
          (seed + artIteration * 104_729 + Math.imul(index + 1, 2_654_435_761)) >>> 0;
        const variantSeed = deriveIterationSeed(mixedSeed || seed + index + 1);
        const rotatedPalette = palette.map(
          (_, swatchIndex) =>
            palette[(swatchIndex + index) % palette.length]?.hex ?? palette[0]?.hex ?? "#2F3542"
        );

        renderBamInspiredPreview(context, width, height, rotatedPalette, variantSeed, {
          minWidth: 0,
          minHeight: 0,
          plainCantext: true
        });
      });
    };

    const scheduleDraw = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        drawMiniArtworks();
      });
    };

    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    return () => {
      window.removeEventListener("resize", scheduleDraw);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [artAspect, artIteration, palette, seed, showcaseScene]);

  const favoriteSet = useMemo(
    () => new Set(favorites.map((entry) => serializePalette(entry))),
    [favorites]
  );
  const toneNames = useMemo(
    () => palette.map((color, index) => toneName(color.hsl, index, seed)),
    [palette, seed]
  );
  const contrastMatrix = useMemo(
    () =>
      palette.map((rowColor) =>
        palette.map((columnColor) => getContrastRatio(rowColor.hex, columnColor.hex))
      ),
    [palette]
  );
  const allThemeOptions = useMemo(
    () => [
      ...PALETTE_THEME_OPTIONS,
      ...customThemes.map((theme) => ({
        id: theme.id,
        name: `${theme.name} (Custom)`
      }))
    ],
    [customThemes]
  );
  const analyticsSummary = useMemo(() => {
    const hues = palette.map((entry) => entry.hsl.h);
    const saturations = palette.map((entry) => entry.hsl.s);
    const lightnessValues = palette.map((entry) => entry.hsl.l);

    let minContrast = Number.POSITIVE_INFINITY;
    let maxContrast = Number.NEGATIVE_INFINITY;
    let minPair: [number, number] = [0, 0];
    let maxPair: [number, number] = [0, 0];
    let contrastTotal = 0;
    let contrastCount = 0;
    let aaPassingPairs = 0;

    for (let row = 0; row < contrastMatrix.length; row += 1) {
      for (let column = row + 1; column < contrastMatrix.length; column += 1) {
        const ratio = contrastMatrix[row]?.[column] ?? 1;
        contrastTotal += ratio;
        contrastCount += 1;

        if (ratio < minContrast) {
          minContrast = ratio;
          minPair = [row, column];
        }
        if (ratio > maxContrast) {
          maxContrast = ratio;
          maxPair = [row, column];
        }
        if (ratio >= AA_TEXT_TARGET) {
          aaPassingPairs += 1;
        }
      }
    }

    const averageContrast = contrastCount > 0 ? contrastTotal / contrastCount : 1;
    const hueSpread = getHueSpread(hues);
    const saturationRange = Math.max(...saturations) - Math.min(...saturations);
    const lightnessRange = Math.max(...lightnessValues) - Math.min(...lightnessValues);
    const aaPassRate = contrastCount > 0 ? (aaPassingPairs / contrastCount) * 100 : 0;

    return {
      hueSpread,
      saturationRange,
      lightnessRange,
      averageContrast,
      minContrast: Number.isFinite(minContrast) ? minContrast : 1,
      maxContrast: Number.isFinite(maxContrast) ? maxContrast : 1,
      minPair,
      maxPair,
      aaPassRate,
      aaPassingPairs,
      totalPairs: contrastCount
    };
  }, [contrastMatrix, palette]);
  const analyticsNarrative = useMemo(() => {
    const variety = describeHueVariety(analyticsSummary.hueSpread);
    const energy = describeSaturationEnergy(analyticsSummary.saturationRange);
    const depth = describeLightnessDepth(analyticsSummary.lightnessRange);
    const readability = describeReadability(analyticsSummary.averageContrast);
    const accessibility = describeAccessibility(analyticsSummary.aaPassRate);

    const strongestPair = {
      a: analyticsSummary.maxPair[0],
      b: analyticsSummary.maxPair[1],
      ratio: analyticsSummary.maxContrast
    };
    const weakestPair = {
      a: analyticsSummary.minPair[0],
      b: analyticsSummary.minPair[1],
      ratio: analyticsSummary.minContrast
    };
    const tip =
      accessibility.tone === "strong"
        ? "Most pairings are text-safe. You can use this palette flexibly across UI surfaces."
        : accessibility.tone === "balanced"
          ? "Use the highest-contrast pair for body text; use close pairs for accents or large titles."
          : "Reserve low-contrast pairs for decoration and use only the strongest pair for small text.";

    return {
      variety,
      energy,
      depth,
      readability,
      accessibility,
      strongestPair,
      weakestPair,
      tip
    };
  }, [analyticsSummary]);
  const studioPreview = useMemo(() => {
    const fallback = palette[0];
    const primary = palette[0] ?? fallback;
    const secondary = palette[1] ?? fallback;
    const tertiary = palette[2] ?? fallback;
    const quaternary = palette[3] ?? fallback;
    const accent = palette[4] ?? tertiary ?? secondary ?? primary;

    return {
      dark: primary,
      surface: secondary ?? primary,
      base: tertiary ?? secondary ?? primary,
      light: quaternary ?? accent ?? tertiary ?? secondary ?? primary,
      accent: accent ?? primary,
      accentAlt: tertiary ?? secondary ?? primary
    };
  }, [palette]);
  const miniArtworkAspectRatio =
    artAspect === "square" ? "1 / 1" : artAspect === "portrait" ? "5 / 7" : "7 / 5";

  const currentPaletteKey = useMemo(() => serializePalette(palette), [palette]);
  const isCurrentFavorite = favoriteSet.has(currentPaletteKey);
  const preferredThemeId =
    selectedThemeId === AUTO_THEME_ID ? themeId : selectedThemeId;
  const buildLockedColors = (
    sourcePalette: PaletteColor[],
    sourceLocks: boolean[]
  ): Array<HslColor | null> =>
    sourcePalette.map((color, index) => (sourceLocks[index] ? color.hsl : null));
  const refreshVariantSnapshot = (
    sourceSeed: number,
    sourcePalette: PaletteColor[],
    sourceLocks: boolean[],
    sourceThemeId: string,
    sourceThemeName: string
  ) => {
    setVariantSnapshot({
      seed: sourceSeed,
      basePalette: sourcePalette,
      locks: sourceLocks,
      themeId: sourceThemeId,
      themeName: sourceThemeName
    });
  };
  const currentMasterSeed = useMemo(
    () =>
      buildMasterSeed({
        v: 1,
        seed,
        themeId,
        selectedThemeId,
        locks,
        palette
      }),
    [locks, palette, seed, selectedThemeId, themeId]
  );
  const variantBaseTheme = useMemo<PaletteTheme>(
    () => ({
      id: "__variant-base",
      name: "Variant Base",
      colors: variantSnapshot.basePalette.map((color) => color.hex)
    }),
    [variantSnapshot.basePalette]
  );
  const variantPalettes = useMemo(() => {
    const lockedColors = variantSnapshot.basePalette.map((color, index) =>
      variantSnapshot.locks[index] ? color.hsl : null
    );
    return Array.from({ length: VARIANT_COUNT }, (_, index) => {
      const mixed = (variantSnapshot.seed + Math.imul(index + 1, 2654435761)) >>> 0;
      const variantSeed = deriveIterationSeed(mixed || variantSnapshot.seed + index + 1);
      const generated = generatePalette(
        variantSeed,
        lockedColors,
        variantBaseTheme.id,
        [variantBaseTheme]
      );

      return {
        seed: variantSeed,
        themeId: variantSnapshot.themeId,
        themeName: variantSnapshot.themeName,
        colors: generated.colors
      };
    });
  }, [variantBaseTheme, variantSnapshot]);

  const resolveThemeName = (candidateThemeId: string): string =>
    allThemeOptions.find((theme) => theme.id === candidateThemeId)?.name ?? "Custom";

  const copyText = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const generateNextPalette = () => {
    const nextSeed = makeRandomSeed();
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(
      nextSeed,
      lockedColors,
      selectedThemeId === AUTO_THEME_ID ? undefined : selectedThemeId,
      customThemes
    );

    setSeed(nextSeed);
    setPalette(generated.colors);
    setThemeId(generated.themeId);
    setThemeName(generated.themeName);
    refreshVariantSnapshot(nextSeed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(480);
  };

  const iteratePalette = () => {
    const nextSeed = deriveIterationSeed(seed);
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(
      nextSeed,
      lockedColors,
      preferredThemeId === AUTO_THEME_ID ? undefined : preferredThemeId,
      customThemes
    );

    setSeed(nextSeed);
    setPalette(generated.colors);
    setThemeId(generated.themeId);
    setThemeName(generated.themeName);
    refreshVariantSnapshot(nextSeed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(420);
  };

  const setTheme = (nextThemeId: string, themePoolOverride?: PaletteTheme[]) => {
    setSelectedThemeId(nextThemeId);

    const themePool = themePoolOverride ?? customThemes;
    const preferredThemeId = nextThemeId === AUTO_THEME_ID ? undefined : nextThemeId;
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(seed, lockedColors, preferredThemeId, themePool);
    setPalette(generated.colors);
    setThemeId(generated.themeId);
    setThemeName(generated.themeName);
    refreshVariantSnapshot(seed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(420);
  };

  const toggleLock = (index: number) => {
    setLocks((prev) => {
      const nextLocks = prev.map((isLocked, swatchIndex) =>
        swatchIndex === index ? !isLocked : isLocked
      );
      refreshVariantSnapshot(seed, palette, nextLocks, themeId, themeName);
      return nextLocks;
    });
  };

  const copyHex = async (hex: string) => {
    const copied = await copyText(hex);
    if (copied) {
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((value) => (value === hex ? null : value)), 1300);
    } else {
      setCopiedHex(null);
    }
  };

  const copyMasterSeed = async () => {
    const copied = await copyText(currentMasterSeed);
    pushSeedMessage(copied ? "Master seed copied." : "Clipboard unavailable.");
  };

  const applyMasterSeed = () => {
    const parsed = parseMasterSeed(masterSeedInput);
    if (!parsed) {
      pushSeedMessage("Invalid master seed format.");
      return;
    }

    const knownThemeSelection =
      parsed.selectedThemeId === AUTO_THEME_ID ||
      allThemeOptions.some((theme) => theme.id === parsed.selectedThemeId)
        ? parsed.selectedThemeId
        : AUTO_THEME_ID;

    setSeed(parsed.seed);
    setPalette(parsed.palette);
    setLocks(parsed.locks);
    setThemeId(parsed.themeId);
    setThemeName(resolveThemeName(parsed.themeId));
    setSelectedThemeId(knownThemeSelection);
    refreshVariantSnapshot(
      parsed.seed,
      parsed.palette,
      parsed.locks,
      parsed.themeId,
      resolveThemeName(parsed.themeId)
    );
    setDrawerOpen(false);
    flashGenerating(420);
    pushSeedMessage("Master seed loaded.");
  };

  const saveFavorite = () => {
    setFavorites((prev) => {
      const deduped = prev.filter((entry) => serializePalette(entry) !== currentPaletteKey);
      const next = [palette, ...deduped];
      return next.slice(0, MAX_FAVORITES);
    });
  };

  const removeFavorite = (index: number) => {
    setFavorites((prev) => prev.filter((_, favoriteIndex) => favoriteIndex !== index));
  };

  const applyFavorite = (favorite: PaletteColor[]) => {
    setPalette(favorite);
    setThemeName("Saved Favorite");
    setSelectedThemeId(AUTO_THEME_ID);
    setLocks([...EMPTY_LOCKS]);
    refreshVariantSnapshot(seed, favorite, [...EMPTY_LOCKS], themeId, "Saved Favorite");
    setDrawerOpen(false);
  };

  const applyVariant = (variant: {
    seed: number;
    themeId: string;
    themeName: string;
    colors: PaletteColor[];
  }) => {
    setSeed(variant.seed);
    setPalette(variant.colors);
    setThemeId(variant.themeId);
    setThemeName(variant.themeName);
    setDrawerOpen(false);
    flashGenerating(360);
  };

  const useCurrentPaletteForCustomTheme = () => {
    setCustomThemeColors(palette.map((entry) => entry.hex));
    pushCustomThemeMessage("Current palette loaded into custom editor.");
  };

  const updateCustomThemeColor = (index: number, value: string) => {
    setCustomThemeColors((prev) =>
      prev.map((entry, colorIndex) => (colorIndex === index ? value.toUpperCase() : entry))
    );
  };

  const saveCustomTheme = () => {
    const trimmedName = customThemeName.trim();
    if (!trimmedName) {
      pushCustomThemeMessage("Name your custom palette first.");
      return;
    }

    const normalizedColors = customThemeColors
      .map((entry) => normalizeHex(entry))
      .filter((entry): entry is string => entry !== null)
      .slice(0, SWATCH_COUNT);

    if (normalizedColors.length !== SWATCH_COUNT) {
      pushCustomThemeMessage("All 5 colors must be valid hex values.");
      return;
    }

    const usedIds = new Set(allThemeOptions.map((entry) => entry.id));
    const nextTheme: PaletteTheme = {
      id: buildCustomThemeId(trimmedName, usedIds),
      name: trimmedName.slice(0, 40),
      colors: normalizedColors
    };

    const nextCustomThemes = [nextTheme, ...customThemes].slice(0, 24);
    setCustomThemes(nextCustomThemes);
    setCustomThemeName("");
    setCustomThemeColors(normalizedColors);
    pushCustomThemeMessage(`Saved "${nextTheme.name}".`);
    setTheme(nextTheme.id, nextCustomThemes);
  };

  const removeCustomTheme = (themeIdToRemove: string) => {
    const nextCustomThemes = customThemes.filter((entry) => entry.id !== themeIdToRemove);
    setCustomThemes(nextCustomThemes);

    if (selectedThemeId === themeIdToRemove || themeId === themeIdToRemove) {
      const lockedColors = palette.map((color, index) => (locks[index] ? color.hsl : null));
      const generated = generatePalette(seed, lockedColors, undefined, nextCustomThemes);
      setSelectedThemeId(AUTO_THEME_ID);
      setPalette(generated.colors);
      setThemeId(generated.themeId);
      setThemeName(generated.themeName);
    }

    pushCustomThemeMessage("Custom palette removed.");
  };

  const refreshMiniArtwork = () => {
    setArtIteration((prev) => prev + 1);
  };

  const movePaletteColor = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= palette.length) return;

    setPalette((prev) => swapIndices(prev, index, targetIndex));
    setLocks((prev) => swapIndices(prev, index, targetIndex));
  };

  const exportCss = () => {
    const css = `:root {\n${palette
      .map((color, index) => `  --color-${index + 1}: ${color.hex};`)
      .join("\n")}\n}\n`;

    const blob = new Blob([css], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "palette.css";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5 lg:px-8 lg:py-8">
        <main className="glass-panel flex flex-col gap-6 rounded-xl border border-zinc-700/60 p-4 shadow-[0_18px_34px_rgba(0,0,0,0.28)] sm:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">PALETTE BY LEMONHAZE</p>
              <h1 className="text-2xl font-semibold text-zinc-100">Generative Color Explorer</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-hex text-xs text-zinc-400">seed: {seed}</p>
                <p className="text-xs uppercase tracking-[0.14em] text-zinc-300">theme: {themeName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="theme-select">
                Select palette theme
              </label>
              <div className="relative">
                <select
                  id="theme-select"
                  value={selectedThemeId}
                  onChange={(event) => setTheme(event.target.value)}
                  className="appearance-none rounded-md border border-zinc-600/70 bg-zinc-900/70 pl-3 pr-9 py-2 text-sm text-zinc-200 outline-none transition hover:border-zinc-500 focus:border-zinc-400"
                >
                  <option value={AUTO_THEME_ID}>Auto Theme</option>
                  {allThemeOptions.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-zinc-400">
                  <ChevronDownIcon />
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen((open) => !open)}
                className="rounded-md border border-zinc-600/70 px-3 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50 lg:hidden"
              >
                Favorites ({favorites.length}/{MAX_FAVORITES})
              </button>
            </div>
          </header>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Palette Swatches</p>
              <p className="font-hex text-[11px] tracking-[0.12em] text-zinc-500">
                compact cards, lock + copy per color
              </p>
            </div>
            <div
              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 transition-opacity duration-300 ${
                isGenerating ? "opacity-90" : "opacity-100"
              }`}
            >
              {palette.map((color, index) => {
                const isLocked = locks[index];
                const isCopied = copiedHex === color.hex;
                const onColor = getReadableTextColor(color.hex);

                return (
                  <article
                    key={`swatch-card-${index}`}
                    className="rounded-md border border-zinc-700/70 bg-zinc-900/45 p-2"
                  >
                    <div
                      className="relative h-24 overflow-hidden rounded-md border border-black/30"
                      style={{ backgroundColor: color.hex }}
                    >
                      <span
                        className="absolute left-2 top-2 font-hex text-[10px] tracking-[0.12em]"
                        style={{ color: onColor }}
                      >
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleLock(index)}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border backdrop-blur"
                        style={{
                          color: onColor,
                          borderColor: "rgba(15, 23, 42, 0.32)",
                          backgroundColor: "rgba(255, 255, 255, 0.22)"
                        }}
                        aria-label={isLocked ? `Unlock ${color.hex}` : `Lock ${color.hex}`}
                      >
                        {isLocked ? <LockClosedIcon /> : <LockOpenIcon />}
                      </button>
                      <p
                        className="absolute bottom-2 left-2 font-hex text-[11px] tracking-[0.12em]"
                        style={{ color: onColor }}
                      >
                        {color.hex}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{toneNames[index]}</p>
                      <button
                        type="button"
                        onClick={() => copyHex(color.hex)}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-600/70 px-2 py-1 text-[11px] text-zinc-200 transition hover:border-zinc-500"
                        aria-label={`Copy ${color.hex}`}
                      >
                        {isCopied ? <CheckIcon /> : null}
                        {isCopied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Variant Lab</p>
                <p className="font-hex text-[11px] tracking-[0.12em] text-zinc-500">
                  same locks, nearby deterministic seeds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariantLabOpen((open) => !open)}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-600/70 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                aria-expanded={variantLabOpen}
              >
                {variantLabOpen ? "Collapse" : "Expand"}
                <ChevronDownIcon rotated={variantLabOpen} />
              </button>
            </div>
            {variantLabOpen ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {variantPalettes.map((variant, index) => {
                  const variantKey = serializePalette(variant.colors);
                  const isCurrent = variantKey === currentPaletteKey;
                  return (
                    <button
                      key={`${variant.seed}-${index}`}
                      type="button"
                      onClick={() => applyVariant(variant)}
                      className={`rounded-md border p-2 text-left transition ${
                        isCurrent
                          ? "border-zinc-300/70 bg-zinc-200/10"
                          : "border-zinc-700/70 bg-zinc-900/40 hover:border-zinc-500"
                      }`}
                      aria-label={`Apply variant ${index + 1}`}
                    >
                      <span className="mb-2 flex h-7 overflow-hidden rounded-sm border border-black/25">
                        {variant.colors.map((color, swatchIndex) => (
                          <span
                            key={`${color.hex}-${swatchIndex}`}
                            className="h-full flex-1"
                            style={{ backgroundColor: color.hex }}
                          />
                        ))}
                      </span>
                      <span className="block text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                        Variant {index + 1}
                      </span>
                      <span className="font-hex text-[11px] tracking-[0.12em] text-zinc-300">
                        seed: {variant.seed}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-zinc-700/70 bg-zinc-900/35 px-3 py-2 text-xs text-zinc-500">
                Variant Lab is collapsed. Expand to browse deterministic nearby seeds.
              </p>
            )}
          </section>

          <footer className="flex flex-wrap items-center gap-3 border-t border-zinc-700/70 pt-4">
            <button
              type="button"
              onClick={generateNextPalette}
              className="rounded-md border border-zinc-400/70 bg-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
            >
              Generate
            </button>

            <button
              type="button"
              onClick={iteratePalette}
              className="rounded-md border border-zinc-500/70 bg-zinc-700/40 px-4 py-2.5 text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-700/70"
            >
              Iterate
            </button>

            <button
              type="button"
              onClick={saveFavorite}
              className={`rounded-md border px-4 py-2.5 text-sm transition ${
                isCurrentFavorite
                  ? "border-zinc-300/70 bg-zinc-300/15 text-zinc-100"
                  : "border-zinc-600/70 text-zinc-200 hover:border-zinc-500 hover:text-zinc-100"
              }`}
            >
              {isCurrentFavorite ? "Saved" : "Save Favorite"}
            </button>

            <button
              type="button"
              onClick={exportCss}
              className="rounded-md border border-zinc-600/70 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
            >
              Export CSS
            </button>

            <p className="ml-auto text-xs text-zinc-500">
              Generate = fully new seed. Iterate = same direction, next deterministic variation.
            </p>
          </footer>

          <section className="glass-panel rounded-lg border border-zinc-700/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Master Seed</h2>
              <p className="font-hex text-[11px] tracking-[0.12em] text-zinc-500">
                deterministic snapshot
              </p>
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={currentMasterSeed}
                  readOnly
                  className="w-full rounded-md border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 font-hex text-[11px] tracking-[0.1em] text-zinc-200"
                  aria-label="Current master seed"
                />
                <button
                  type="button"
                  onClick={copyMasterSeed}
                  className="rounded-md border border-zinc-600/70 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                >
                  Copy
                </button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={masterSeedInput}
                  onChange={(event) => setMasterSeedInput(event.target.value)}
                  placeholder={`Paste ${MASTER_SEED_PREFIX}.… and load`}
                  className="w-full rounded-md border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 font-hex text-[11px] tracking-[0.1em] text-zinc-300 placeholder:text-zinc-500"
                  aria-label="Paste master seed"
                />
                <button
                  type="button"
                  onClick={applyMasterSeed}
                  className="rounded-md border border-zinc-500/70 bg-zinc-700/50 px-3 py-2 text-xs text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-700/70"
                >
                  Load
                </button>
              </div>
              <p className="text-xs text-zinc-500">
                {seedMessage ?? "Copy and share exact palette state, or load one to restore it."}
              </p>
            </div>
          </section>

          <section className="glass-panel rounded-lg border border-zinc-700/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Custom Palette Forge</h2>
              <p className="font-hex text-[11px] tracking-[0.12em] text-zinc-500">
                create and keep your own palette themes
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={customThemeName}
                  onChange={(event) => setCustomThemeName(event.target.value)}
                  placeholder="Name your palette"
                  className="w-full rounded-md border border-zinc-700/70 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={useCurrentPaletteForCustomTheme}
                  className="rounded-md border border-zinc-600/70 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                >
                  Use Current
                </button>
                <button
                  type="button"
                  onClick={saveCustomTheme}
                  className="rounded-md border border-zinc-500/70 bg-zinc-700/50 px-3 py-2 text-xs text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-700/70"
                >
                  Save Custom
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                {customThemeColors.map((value, index) => (
                  <label
                    key={`custom-color-${index}`}
                    className="rounded-md border border-zinc-700/70 bg-zinc-900/45 p-2"
                  >
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                      Color {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={normalizeHex(value) ?? "#000000"}
                        onChange={(event) => updateCustomThemeColor(index, event.target.value)}
                        className="h-9 w-10 rounded border border-zinc-600/70 bg-transparent"
                        aria-label={`Choose custom color ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(event) => updateCustomThemeColor(index, event.target.value)}
                        onBlur={(event) => {
                          const normalized = normalizeHex(event.target.value);
                          if (normalized) {
                            updateCustomThemeColor(index, normalized);
                          }
                        }}
                        className="w-full rounded-md border border-zinc-700/70 bg-zinc-900/55 px-2 py-1.5 font-hex text-[11px] tracking-[0.08em] text-zinc-300"
                        aria-label={`Custom hex color ${index + 1}`}
                      />
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs text-zinc-500">
                {customThemeMessage ??
                  "Save a custom palette, then pick it from theme selector or apply it below."}
              </p>

              {customThemes.length === 0 ? (
                <p className="rounded-md border border-dashed border-zinc-700 p-3 text-xs text-zinc-500">
                  No custom palettes yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {customThemes.map((theme) => (
                    <li
                      key={theme.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-700/70 bg-zinc-900/40 p-2"
                    >
                      <div className="mr-1 flex h-8 w-36 overflow-hidden rounded-sm border border-black/25">
                        {theme.colors.slice(0, SWATCH_COUNT).map((color, index) => (
                          <span
                            key={`${theme.id}-${index}`}
                            className="h-full flex-1"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="text-xs uppercase tracking-[0.12em] text-zinc-300">{theme.name}</p>
                      <button
                        type="button"
                        onClick={() => setTheme(theme.id)}
                        className="ml-auto rounded-md border border-zinc-600/70 px-2 py-1 text-xs text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-100"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCustomTheme(theme.id)}
                        className="rounded-md border border-zinc-600/70 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="glass-panel rounded-lg border border-zinc-700/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Studio Showcase</h2>
              <p className="font-hex text-[11px] tracking-[0.14em] text-zinc-400">
                {SHOWCASE_SCENES.find((scene) => scene.id === showcaseScene)?.label}
              </p>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {SHOWCASE_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => setShowcaseScene(scene.id)}
                  className={`rounded-md border px-2.5 py-1.5 text-[11px] transition ${
                    showcaseScene === scene.id
                      ? "border-zinc-300/70 bg-zinc-200/10 text-zinc-100"
                      : "border-zinc-600/70 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
                  }`}
                >
                  {scene.label}
                </button>
              ))}
            </div>

            {showcaseScene === "frontend" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <article
                  className="rounded-lg border border-zinc-700/70 p-4"
                  style={{
                    background: `linear-gradient(145deg, ${studioPreview.dark.hex}, ${studioPreview.surface.hex})`
                  }}
                >
                  <div className="mb-6 flex items-center justify-between text-[10px] uppercase tracking-[0.12em]">
                    <span style={{ color: getReadableTextColor(studioPreview.surface.hex) }}>Creative Studio</span>
                    <span style={{ color: getReadableTextColor(studioPreview.surface.hex), opacity: 0.76 }}>
                      {themeName}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <p
                      className="text-xs uppercase tracking-[0.12em]"
                      style={{ color: getReadableTextColor(studioPreview.dark.hex), opacity: 0.8 }}
                    >
                      Landing Hero
                    </p>
                    <h3
                      className="max-w-md text-xl font-medium leading-tight"
                      style={{ color: getReadableTextColor(studioPreview.dark.hex) }}
                    >
                      Build coherent interface systems from one palette seed.
                    </h3>
                    <p
                      className="max-w-lg text-sm"
                      style={{ color: getReadableTextColor(studioPreview.surface.hex), opacity: 0.82 }}
                    >
                      Flat and readable composition for product websites and creative portfolios.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md px-3 py-2 text-xs font-medium"
                        style={{
                          backgroundColor: studioPreview.accent.hex,
                          color: getReadableTextColor(studioPreview.accent.hex)
                        }}
                      >
                        Primary CTA
                      </button>
                      <button
                        type="button"
                        className="rounded-md border px-3 py-2 text-xs font-medium"
                        style={{
                          borderColor: `${studioPreview.light.hex}AA`,
                          color: getReadableTextColor(studioPreview.surface.hex)
                        }}
                      >
                        Secondary
                      </button>
                    </div>
                  </div>
                </article>

                <div className="grid gap-3">
                  <article className="rounded-lg border border-zinc-700/70 bg-zinc-900/45 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">Component Kit</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md px-2.5 py-1.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: studioPreview.accentAlt.hex,
                          color: getReadableTextColor(studioPreview.accentAlt.hex)
                        }}
                      >
                        Action
                      </button>
                      <span
                        className="rounded-md border px-2 py-1 text-[10px]"
                        style={{
                          borderColor: `${studioPreview.light.hex}80`,
                          color: studioPreview.light.hex
                        }}
                      >
                        Tag
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {palette.slice(0, 3).map((color, index) => (
                        <div
                          key={`showcase-row-${color.hex}-${index}`}
                          className="flex items-center gap-2 rounded-md border border-zinc-700/70 px-2 py-1.5"
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-black/30"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span className="font-hex text-[10px] tracking-[0.1em] text-zinc-300">{color.hex}</span>
                          <span className="ml-auto text-[10px] text-zinc-500">{toneNames[index]}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="rounded-lg border border-zinc-700/70 bg-zinc-900/45 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">Color Rhythm</p>
                      <p className="text-[10px] text-zinc-500">Reorder to remap live showcase roles</p>
                    </div>
                    <div className="space-y-1.5">
                      {palette.map((color, index) => (
                        <div key={`rhythm-${color.hex}-${index}`} className="flex items-center gap-2">
                          <span className="w-5 text-[10px] text-zinc-500">{index + 1}</span>
                          <span
                            className="h-5 rounded"
                            style={{
                              width: `${34 + color.hsl.s * 0.62}%`,
                              backgroundColor: color.hex
                            }}
                          />
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => movePaletteColor(index, -1)}
                              disabled={index === 0}
                              className="rounded border border-zinc-700/70 px-1.5 py-0.5 text-[10px] text-zinc-300 disabled:opacity-40"
                              aria-label={`Move color ${index + 1} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => movePaletteColor(index, 1)}
                              disabled={index === palette.length - 1}
                              className="rounded border border-zinc-700/70 px-1.5 py-0.5 text-[10px] text-zinc-300 disabled:opacity-40"
                              aria-label={`Move color ${index + 1} down`}
                            >
                              ↓
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </div>
            ) : null}

            {showcaseScene === "commerce" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/35 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-100">Sketch Atelier</h3>
                      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                        Capsule drop powered by palette
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md px-2.5 py-1 text-[10px] font-medium"
                      style={{
                        backgroundColor: studioPreview.accent.hex,
                        color: getReadableTextColor(studioPreview.accent.hex)
                      }}
                    >
                      View Cart
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {palette.slice(0, 3).map((color, index) => (
                      <div
                        key={`commerce-product-${color.hex}-${index}`}
                        className="rounded-md border border-zinc-700/70 p-2"
                        style={{ backgroundColor: `${studioPreview.surface.hex}35` }}
                      >
                        <div className="mb-2 rounded-md border border-black/25 bg-zinc-950/35 p-1.5">
                          <div className="mx-auto grid w-[74px] grid-cols-10 gap-[1px] rounded-sm bg-black/25 p-1">
                            {PIXEL_GARMENT_MAP.flatMap((row, rowIndex) =>
                              row.split("").map((pixel, pixelIndex) => (
                                <span
                                  key={`garment-${index}-${rowIndex}-${pixelIndex}`}
                                  className="h-[5px] w-[5px] rounded-[1px]"
                                  style={{
                                    backgroundColor:
                                      pixel === "1"
                                        ? index % 2 === 0
                                          ? color.hex
                                          : studioPreview.accentAlt.hex
                                        : "rgba(0,0,0,0.14)"
                                  }}
                                />
                              ))
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-200">Sketch Tee #{index + 1}</p>
                        <p className="text-[10px] text-zinc-500">{themeName} Edition</p>
                        <p className="font-hex text-[10px] text-zinc-400">${(index + 1) * 79}.00</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-lg border border-zinc-700/70 bg-zinc-900/45 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">Checkout UI</p>
                  <div className="space-y-2">
                    <div className="rounded-md border border-zinc-700/70 p-2 text-[11px] text-zinc-300">
                      Shipping method
                    </div>
                    <div className="rounded-md border border-zinc-700/70 p-2 text-[11px] text-zinc-300">
                      Billing information
                    </div>
                    <div className="rounded-md border border-zinc-700/70 p-2 text-[11px] text-zinc-300">
                      Promo: SKETCHLOVE-10
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-md py-2 text-[11px] font-medium"
                      style={{
                        backgroundColor: studioPreview.accentAlt.hex,
                        color: getReadableTextColor(studioPreview.accentAlt.hex)
                      }}
                    >
                      Complete Purchase
                    </button>
                  </div>
                </article>
              </div>
            ) : null}

            {showcaseScene === "mobile" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <article className="flex items-center justify-center rounded-lg border border-zinc-700/70 bg-zinc-950/30 p-4">
                  <div className="w-60 rounded-[28px] border border-zinc-600/70 bg-zinc-950 p-2 shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
                    <div className="h-[430px] rounded-[22px] p-3" style={{ backgroundColor: studioPreview.surface.hex }}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[10px]" style={{ color: getReadableTextColor(studioPreview.surface.hex) }}>
                          9:41
                        </span>
                        <span className="text-[10px]" style={{ color: getReadableTextColor(studioPreview.surface.hex) }}>
                          Palette App
                        </span>
                      </div>
                      <div className="space-y-2">
                        {palette.slice(0, 4).map((color, index) => (
                          <div
                            key={`mobile-tile-${color.hex}-${index}`}
                            className="rounded-xl border border-black/20 p-2"
                            style={{ backgroundColor: color.hex, color: getReadableTextColor(color.hex) }}
                          >
                            <p className="text-[11px] font-medium">Card {index + 1}</p>
                            <p className="font-hex text-[10px]">{color.hex}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>

                <article className="rounded-lg border border-zinc-700/70 bg-zinc-900/45 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">Mobile Tokens</p>
                  <div className="space-y-2">
                    {palette.map((color, index) => (
                      <div
                        key={`mobile-token-${color.hex}-${index}`}
                        className="flex items-center gap-2 rounded-md border border-zinc-700/70 px-2 py-1.5"
                      >
                        <span
                          className="h-4 w-4 rounded border border-black/30"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span className="text-[11px] text-zinc-300">Level {index + 1}</span>
                        <span className="ml-auto font-hex text-[10px] text-zinc-500">{color.hex}</span>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}

            {showcaseScene === "art" ? (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <article className="rounded-lg border border-zinc-700/70 bg-zinc-900/45 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">Sketch Micro Generator</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      readOnly
                      value={`prompt: sketch study, palette ${themeName}`}
                      className="w-full rounded-md border border-zinc-700/70 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-300"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-zinc-700/70 bg-zinc-950/45 px-2 py-1.5 text-[10px] text-zinc-400">
                        seed: {seed}
                      </div>
                      <div className="rounded-md border border-zinc-700/70 bg-zinc-950/45 px-2 py-1.5 text-[10px] text-zinc-400">
                        studies: {MINI_ARTWORK_COUNT}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["portrait", "5:7"],
                          ["square", "1:1"],
                          ["landscape", "7:5"]
                        ] as Array<[ArtAspect, string]>
                      ).map(([id, label]) => (
                        <button
                          key={`art-aspect-${id}`}
                          type="button"
                          onClick={() => setArtAspect(id)}
                          className={`rounded-md border px-2 py-1 text-[10px] transition ${
                            artAspect === id
                              ? "border-zinc-300/70 bg-zinc-200/10 text-zinc-100"
                              : "border-zinc-600/70 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                          }`}
                        >
                          Ratio {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={refreshMiniArtwork}
                      className="rounded-md px-3 py-2 text-xs font-medium"
                      style={{
                        backgroundColor: studioPreview.accent.hex,
                        color: getReadableTextColor(studioPreview.accent.hex)
                      }}
                    >
                      Re-roll Mini Sketch
                    </button>
                  </div>
                </article>

                <article className="rounded-lg border border-zinc-700/70 bg-zinc-950/28 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                      Sketch-like Output Studies
                    </p>
                    <p className="font-hex text-[10px] text-zinc-500">{artAspect.toUpperCase()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: MINI_ARTWORK_COUNT }).map((_, index) => {
                      const variantSeed = deriveIterationSeed(
                        (seed + artIteration * 104_729 + Math.imul(index + 1, 2_654_435_761)) >>> 0
                      );
                      return (
                        <div key={`art-preview-${index}`} className="space-y-1">
                          <div
                            className="overflow-hidden rounded-md border border-black/25 bg-zinc-900/50"
                            style={{ aspectRatio: miniArtworkAspectRatio }}
                          >
                            <canvas
                              ref={(node) => {
                                miniArtworkCanvasRefs.current[index] = node;
                              }}
                              className="h-full w-full"
                            />
                          </div>
                          <p className="font-hex text-[9px] tracking-[0.1em] text-zinc-500">
                            seed {variantSeed}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-zinc-500">
                    Uses sketch-inspired micro pipeline (composition, MT blocks, swirl) for each mini.
                  </p>
                </article>
              </div>
            ) : null}
          </section>

          <section className="glass-panel rounded-lg border border-zinc-700/70 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-zinc-200">Palette Analytics</h2>
              <p className="font-hex text-[11px] tracking-[0.12em] text-zinc-500">
                plain-language palette health check
              </p>
            </div>
            <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-md border border-zinc-700/70 bg-zinc-900/45 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Color Variety</p>
                <p className={`text-sm font-semibold ${METRIC_TONE_CLASS[analyticsNarrative.variety.tone]}`}>
                  {analyticsNarrative.variety.label}
                </p>
                <p className="font-hex text-[11px] tracking-[0.1em] text-zinc-300">
                  {analyticsSummary.hueSpread.toFixed(1)}° spread
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {analyticsNarrative.variety.detail}
                </p>
              </div>
              <div className="rounded-md border border-zinc-700/70 bg-zinc-900/45 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Color Energy</p>
                <p className={`text-sm font-semibold ${METRIC_TONE_CLASS[analyticsNarrative.energy.tone]}`}>
                  {analyticsNarrative.energy.label}
                </p>
                <p className="font-hex text-[11px] tracking-[0.1em] text-zinc-300">
                  {analyticsSummary.saturationRange.toFixed(1)} sat range
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {analyticsNarrative.energy.detail}
                </p>
              </div>
              <div className="rounded-md border border-zinc-700/70 bg-zinc-900/45 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Light/Dark Depth</p>
                <p className={`text-sm font-semibold ${METRIC_TONE_CLASS[analyticsNarrative.depth.tone]}`}>
                  {analyticsNarrative.depth.label}
                </p>
                <p className="font-hex text-[11px] tracking-[0.1em] text-zinc-300">
                  {analyticsSummary.lightnessRange.toFixed(1)} lightness range
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {analyticsNarrative.depth.detail}
                </p>
              </div>
              <div className="rounded-md border border-zinc-700/70 bg-zinc-900/45 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Text Safety</p>
                <p
                  className={`text-sm font-semibold ${METRIC_TONE_CLASS[analyticsNarrative.accessibility.tone]}`}
                >
                  {analyticsNarrative.accessibility.label}
                </p>
                <p className="font-hex text-[11px] tracking-[0.1em] text-zinc-300">
                  {analyticsSummary.aaPassingPairs}/{analyticsSummary.totalPairs} pairs AA
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {analyticsNarrative.accessibility.detail}
                </p>
              </div>
            </div>
            <div className="mb-4 rounded-md border border-zinc-700/70 bg-zinc-900/40 px-3 py-3 text-xs text-zinc-400">
              <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-zinc-300">Quick Guidance</p>
              <p>
                Best text combo: Color {analyticsNarrative.strongestPair.a + 1} ({palette[analyticsNarrative.strongestPair.a]?.hex}) on Color{" "}
                {analyticsNarrative.strongestPair.b + 1} ({palette[analyticsNarrative.strongestPair.b]?.hex}) at{" "}
                {analyticsNarrative.strongestPair.ratio.toFixed(2)}:1.
              </p>
              <p className="mt-1">
                Risky combo: Color {analyticsNarrative.weakestPair.a + 1} ({palette[analyticsNarrative.weakestPair.a]?.hex}) on Color{" "}
                {analyticsNarrative.weakestPair.b + 1} ({palette[analyticsNarrative.weakestPair.b]?.hex}) at{" "}
                {analyticsNarrative.weakestPair.ratio.toFixed(2)}:1.
              </p>
              <p className="mt-1">
                Readability snapshot: {analyticsNarrative.readability.label} ({analyticsSummary.averageContrast.toFixed(2)}:1 average).{" "}
                {analyticsNarrative.tip}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <article className="rounded-md border border-zinc-700/70 bg-zinc-900/45 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">Color Wheel Map</p>
                <svg viewBox="0 0 220 220" className="h-44 w-full">
                  <circle cx="110" cy="110" r="74" stroke="rgba(148,163,184,0.35)" strokeWidth="1.5" fill="none" />
                  {palette.map((color, index) => {
                    const angle = ((color.hsl.h - 90) * Math.PI) / 180;
                    const x = 110 + Math.cos(angle) * 74;
                    const y = 110 + Math.sin(angle) * 74;
                    return (
                      <g key={`hue-node-${index}`}>
                        <line
                          x1="110"
                          y1="110"
                          x2={x}
                          y2={y}
                          stroke="rgba(148,163,184,0.28)"
                          strokeWidth="1.2"
                        />
                        <circle cx={x} cy={y} r="8" fill={color.hex} stroke="rgba(15,23,42,0.72)" strokeWidth="2" />
                      </g>
                    );
                  })}
                  <circle cx="110" cy="110" r="6" fill="rgba(148,163,184,0.65)" />
                </svg>
                <p className="mt-2 text-[10px] text-zinc-500">
                  Dots that sit close together belong to similar color families.
                </p>
              </article>

              <article className="rounded-md border border-zinc-700/70 bg-zinc-900/45 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">Tone Balance Map</p>
                <div
                  className="relative h-44 overflow-hidden rounded-md border border-zinc-700/70"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                    backgroundImage:
                      "linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)",
                    backgroundSize: "20% 20%"
                  }}
                >
                  {palette.map((color, index) => (
                    <span
                      key={`sl-point-${index}`}
                      className="absolute h-4 w-4 -tranzinc-x-1/2 -tranzinc-y-1/2 rounded-full border border-zinc-950/80 shadow-[0_0_0_1px_rgba(255,255,255,0.35)]"
                      style={{
                        left: `${color.hsl.s}%`,
                        top: `${100 - color.hsl.l}%`,
                        backgroundColor: color.hex
                      }}
                      aria-label={`Color ${index + 1} saturation ${Math.round(
                        color.hsl.s
                      )} lightness ${Math.round(color.hsl.l)}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  <span>Muted</span>
                  <span>Vivid</span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">Top = lighter tones, bottom = darker tones.</p>
              </article>

              <article className="rounded-md border border-zinc-700/70 bg-zinc-900/45 p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-zinc-400">Text Readability Grid</p>
                <div className="overflow-hidden rounded-md border border-zinc-700/60">
                  <table className="w-full border-separate border-spacing-1 text-[10px]">
                    <thead>
                      <tr className="text-zinc-400">
                        <th className="px-1 py-1 text-left font-normal">#</th>
                        {palette.map((_, index) => (
                          <th key={`contrast-col-${index}`} className="px-1 py-1 text-left font-normal">
                            {index + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {contrastMatrix.map((ratios, rowIndex) => (
                        <tr key={`contrast-row-${rowIndex}`}>
                          <th className="px-1 py-1 text-left font-normal text-zinc-400">{rowIndex + 1}</th>
                          {ratios.map((ratio, columnIndex) => (
                            <td
                              key={`contrast-cell-${rowIndex}-${columnIndex}`}
                              className="rounded px-1 py-1 text-center font-hex"
                              style={{
                                backgroundColor: getContrastHeat(ratio),
                                color: ratio >= 4.5 ? "#f8fafc" : "#111827"
                              }}
                            >
                              {ratio.toFixed(2)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  Values {AA_TEXT_TARGET}+ are AA-safe for normal text
                </p>
              </article>
            </div>
          </section>
        </main>

        <aside
          className={`glass-panel drawer-shadow fixed inset-y-0 right-0 z-30 w-80 border-l border-zinc-700/70 p-4 transition-transform duration-300 lg:static lg:tranzinc-x-0 lg:rounded-xl lg:border ${
            drawerOpen ? "tranzinc-x-0" : "tranzinc-x-full lg:tranzinc-x-0"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-300">
              Favorites ({favorites.length}/{MAX_FAVORITES})
            </h2>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="rounded-md border border-zinc-600/70 px-2 py-1 text-xs text-zinc-300 lg:hidden"
            >
              Close
            </button>
          </div>

          {favorites.length === 0 ? (
            <p className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
              Saved palettes appear here. You can keep up to {MAX_FAVORITES}.
            </p>
          ) : (
            <ul className="space-y-3 overflow-y-auto pr-1">
              {favorites.map((favorite, index) => (
                <li key={`${serializePalette(favorite)}-${index}`} className="rounded-md border border-zinc-700/70 p-3">
                  <button
                    type="button"
                    onClick={() => applyFavorite(favorite)}
                    className="mb-3 flex w-full gap-1.5 rounded-md border border-zinc-700/70 p-1.5 transition hover:border-zinc-500"
                    aria-label={`Apply favorite palette ${index + 1}`}
                  >
                    {favorite.map((color, swatchIndex) => (
                      <span
                        key={`${color.hex}-${swatchIndex}`}
                        className="h-8 flex-1 rounded-sm border border-black/25"
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </button>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {favorite.map((color, swatchIndex) => (
                      <button
                        key={`${color.hex}-${index}-${swatchIndex}`}
                        type="button"
                        onClick={() => copyHex(color.hex)}
                        className="font-hex text-[11px] tracking-[0.14em] text-zinc-400 transition hover:text-zinc-100"
                      >
                        {color.hex}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeFavorite(index)}
                      className="ml-auto rounded-md border border-zinc-600/70 px-2 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      {drawerOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-zinc-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close favorites drawer"
        />
      ) : null}
    </div>
  );
}
