import { MASTER_SEED_PREFIX, SWATCH_COUNT } from "@/lib/constants";
import type { PaletteColor } from "@/lib/palette";
import { isValidPaletteColor } from "@/lib/validators";

export type MasterSeedPayload = {
  v: 1;
  seed: number;
  themeId: string;
  selectedThemeId: string;
  locks: boolean[];
  palette: PaletteColor[];
};

export const deriveIterationSeed = (seed: number): number => {
  const mixed = (Math.imul(seed ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0;
  const bounded = mixed % 2_147_483_647;
  return bounded > 0 ? bounded : 1_337_421;
};

export const base64UrlEncode = (input: string): string => {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const base64UrlDecode = (input: string): string | null => {
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

export const buildMasterSeed = (payload: MasterSeedPayload): string =>
  `${MASTER_SEED_PREFIX}.${base64UrlEncode(JSON.stringify(payload))}`;

export const isValidMasterSeedPayload = (value: unknown): value is MasterSeedPayload => {
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

export const parseMasterSeed = (value: string): MasterSeedPayload | null => {
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
