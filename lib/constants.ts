import type { HslColor } from "@/lib/palette";

export const SWATCH_COUNT = 5;
export const MAX_FAVORITES = 10;
export const FAVORITES_KEY = "palette-favorites-v1";
export const CUSTOM_THEMES_KEY = "palette-custom-themes-v1";
export const SSR_SEED = 421_337_420;
export const AUTO_THEME_ID = "auto";
export const MASTER_SEED_PREFIX = "PLT1";
export const VARIANT_COUNT = 12;
export const MAX_CONTRAST_TARGET = 7;
export const AA_TEXT_TARGET = 4.5;
export const CUSTOM_THEME_PREFIX = "custom";
export const MINI_ARTWORK_COUNT = 4;

export const EMPTY_LOCKS = Array.from({ length: SWATCH_COUNT }, () => false);

export const makeUnlockedColors = (): Array<HslColor | null> =>
  Array.from({ length: SWATCH_COUNT }, () => null);

export const PIXEL_GARMENT_MAP = [
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
