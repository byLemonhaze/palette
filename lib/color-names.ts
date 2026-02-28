import type { HslColor } from "@/lib/palette";

export const toneMaterial = [
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

export const getHueFamily = (hue: number): string => {
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

export const getValueTone = (saturation: number, lightness: number): string => {
  if (lightness > 80) return "Porcelain";
  if (lightness < 20) return "Nocturne";
  if (saturation < 28) return "Muted";
  if (saturation > 78) return "Vivid";
  if (saturation > 60 && lightness > 62) return "Luminous";
  if (lightness < 34) return "Deep";
  return "Balanced";
};

export const toneName = (color: HslColor, index: number, seed: number): string => {
  let hash = Math.imul(Math.round(color.h * 10) + index * 193, 2654435761);
  hash ^= Math.imul(Math.round(color.s * 10) + seed, 2246822519);
  hash ^= Math.imul(Math.round(color.l * 10) + 17, 3266489917);
  hash ^= hash >>> 16;
  const material = toneMaterial[Math.abs(hash) % toneMaterial.length] ?? "Lacquer";
  const family = getHueFamily(color.h);
  const value = getValueTone(color.s, color.l);
  return `${value} ${family} ${material}`;
};
