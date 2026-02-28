import { PALETTE_THEME_OPTIONS } from "@/lib/palette";
import type { PaletteColor, PaletteTheme } from "@/lib/palette";
import { SWATCH_COUNT, CUSTOM_THEME_PREFIX } from "@/lib/constants";

export const isValidPaletteColor = (value: unknown): value is PaletteColor => {
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

export const isValidFavorites = (value: unknown): value is PaletteColor[][] =>
  Array.isArray(value) &&
  value.every(
    (entry) =>
      Array.isArray(entry) &&
      entry.length === SWATCH_COUNT &&
      entry.every(isValidPaletteColor)
  );

export const normalizeHex = (value: string): string | null => {
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

export const sanitizeCustomThemeId = (value: string): string => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${CUSTOM_THEME_PREFIX}-${slug || "palette"}`;
};

export const buildCustomThemeId = (name: string, existingIds: Set<string>): string => {
  const base = sanitizeCustomThemeId(name);
  let candidate = base;
  let suffix = 2;
  while (existingIds.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

export const normalizeCustomTheme = (value: unknown): PaletteTheme | null => {
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

export const parseCustomThemes = (value: unknown): PaletteTheme[] => {
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

export const swapIndices = <T,>(entries: T[], indexA: number, indexB: number): T[] => {
  const next = [...entries];
  [next[indexA], next[indexB]] = [next[indexB]!, next[indexA]!];
  return next;
};

export const serializePalette = (palette: PaletteColor[]): string =>
  palette.map((color) => color.hex).join(",");
