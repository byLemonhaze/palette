import { MAX_CONTRAST_TARGET } from "@/lib/constants";

export const hexToRgb = (hex: string): [number, number, number] => {
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

export const toRelativeLuminance = (hex: string): number => {
  const [red, green, blue] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return (red ?? 0) * 0.2126 + (green ?? 0) * 0.7152 + (blue ?? 0) * 0.0722;
};

export const getContrastRatio = (hexA: string, hexB: string): number => {
  const lA = toRelativeLuminance(hexA);
  const lB = toRelativeLuminance(hexB);
  const light = Math.max(lA, lB);
  const dark = Math.min(lA, lB);
  return (light + 0.05) / (dark + 0.05);
};

export const getContrastHeat = (ratio: number): string => {
  const clamped = Math.max(1, Math.min(MAX_CONTRAST_TARGET, ratio));
  const normalized = (clamped - 1) / (MAX_CONTRAST_TARGET - 1);
  const hue = 6 + normalized * 114;
  return `hsl(${hue} 72% 35%)`;
};

export const getReadableTextColor = (hex: string): string =>
  toRelativeLuminance(hex) > 0.44 ? "#111317" : "#F8FAFC";

export const getHueSpread = (hues: number[]): number => {
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
