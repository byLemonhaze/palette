export type HslColor = {
  h: number;
  s: number;
  l: number;
};

export type PaletteColor = {
  hsl: HslColor;
  hex: string;
};

export type GeneratedPalette = {
  colors: PaletteColor[];
  themeId: string;
  themeName: string;
};

export type PaletteThemeOption = {
  id: string;
  name: string;
};

export type PaletteTheme = {
  id: string;
  name: string;
  colors: string[];
};

const CURATED_PALETTES: PaletteTheme[] = [
  {
    id: "my-love",
    name: "My Love",
    colors: ["#E8DCB4", "#FFFFFF", "#C4006B", "#038A86", "#012057"]
  },
  {
    id: "punch",
    name: "Punch",
    colors: ["#E8DCB4", "#006064", "#FFC400", "#D50000", "#2962FF"]
  },
  {
    id: "hypernova",
    name: "HyperNova",
    colors: ["#FF004D", "#FFB800", "#00F5D4", "#7209B7", "#3A0CA3", "#06D6A0", "#FF6F61"]
  },
  {
    id: "j",
    name: "J",
    colors: ["#FFBE0B", "#FB5607", "#FF006E", "#8338EC", "#3A86FF"]
  },
  {
    id: "90s-festival",
    name: "90s Festival",
    colors: ["#E8DCB4", "#6200EA", "#CDDC39", "#FF3D00", "#00BFA5"]
  },
  {
    id: "horizon",
    name: "Horizon",
    colors: ["#E8DCB4", "#004D40", "#FFEA00", "#1DE9B6", "#6200EA"]
  },
  {
    id: "edo",
    name: "Edo",
    colors: ["#E8DCB4", "#EAA221", "#C02942", "#542437", "#53777A"]
  },
  {
    id: "atelier",
    name: "Atelier",
    colors: ["#E8DCB4", "#223A5E", "#9C9A40", "#D9593D", "#CE7B91", "#025669"]
  },
  {
    id: "goat",
    name: "gOat",
    colors: ["#FBDAA6", "#F37022", "#B11016", "#2ABA9E", "#007096"]
  },
  {
    id: "rouge-a-levres",
    name: "Rouge a Levres",
    colors: ["#E8DCB4", "#D00000", "#9D0208", "#6A040F", "#370617"]
  },
  {
    id: "kk",
    name: "KK",
    colors: ["#F0F3BD", "#1282A2", "#034078", "#001F54", "#0A1128"]
  },
  {
    id: "osaka-nights",
    name: "Osaka Nights",
    colors: ["#E8DCB4", "#E8DCB4", "#4FC1E9", "#E23E57", "#F9C846", "#5F76C8", "#202A44"]
  },
  {
    id: "rickj",
    name: "RickJ",
    colors: ["#E8DCB4", "#F4D58D", "#2A9D8F", "#264653", "#002244", "#A6192E"]
  },
  {
    id: "winter-night",
    name: "Winter Night",
    colors: ["#4E4E4E", "#F511C0", "#33312B", "#4760E9", "#410FF0"]
  },
  {
    id: "neonzilla",
    name: "NEONZILLA",
    colors: ["#00FFB0", "#F90093", "#6C00FF", "#151515", "#FDF6EF"]
  },
  {
    id: "blue-sunset",
    name: "Blue Sunset",
    colors: ["#FF9B85", "#FCCB7E", "#499DAF", "#247BA0", "#70C1B3"]
  },
  {
    id: "belmont",
    name: "Belmont",
    colors: ["#F4F7D9", "#0091AD", "#EABE7C", "#A1E3D8", "#E58B88"]
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    colors: ["#E8DCB4", "#F8B195", "#355C7D", "#F67280", "#C06C84"]
  },
  {
    id: "q",
    name: "Q",
    colors: ["#0A9396", "#94D2BD", "#E9D8A6", "#EE9B00", "#CA6702"]
  },
  {
    id: "ocean",
    name: "Ocean",
    colors: ["#E8DCB4", "#566466", "#235A56", "#05668D", "#00A896"]
  },
  {
    id: "coral",
    name: "Coral",
    colors: ["#DAC89A", "#4C1E20", "#7F8B69", "#4F7674", "#CB6661"]
  },
  {
    id: "mamie",
    name: "Mamie",
    colors: ["#EAE0D5", "#422040", "#73628A", "#D09683", "#F2D492"]
  },
  {
    id: "aurora-drive",
    name: "AURORA DRIVE",
    colors: ["#00FFC6", "#FF3E7F", "#FFE156", "#3A0CA3", "#1A1A1A", "#7CFF01"]
  },
  {
    id: "solstice",
    name: "SOLSTICE",
    colors: ["#FF5C8D", "#FFB84D", "#06D6A0", "#2E2E3A", "#4A4E69", "#7B2CBF"]
  },
  {
    id: "electric-saints",
    name: "ELECTRIC SAINTS",
    colors: ["#FF006E", "#00F5FF", "#FFD23F", "#7209B7", "#1A1A1A", "#F6F7F8", "#06D6A0"]
  },
  {
    id: "chrysalis",
    name: "CHRYSALIS",
    colors: ["#31FFD7", "#FF0099", "#FFE36E", "#1A1D2E", "#6F00FF", "#00D4FF", "#FFEEE5"]
  },
  {
    id: "lunarcyte",
    name: "LUNARCYTE",
    colors: ["#00F2FF", "#FF2E63", "#F7FF00", "#6E00FF", "#161616", "#80FFB4", "#EDE6FF"]
  }
];

export const PALETTE_THEME_OPTIONS: PaletteThemeOption[] = CURATED_PALETTES.map(
  (palette) => ({
    id: palette.id,
    name: palette.name
  })
);

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const wrapHue = (value: number): number => ((value % 360) + 360) % 360;
const shortestHueDelta = (from: number, to: number): number =>
  ((to - from + 540) % 360) - 180;

const mulberry32 = (seed: number): (() => number) => {
  let t = seed;

  return () => {
    t += 0x6d2b79f5;
    let out = Math.imul(t ^ (t >>> 15), 1 | t);
    out ^= out + Math.imul(out ^ (out >>> 7), 61 | out);
    return ((out ^ (out >>> 14)) >>> 0) / 4294967296;
  };
};

const hashString = (input: string): number => {
  let h = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    h ^= input.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const gcd = (a: number, b: number): number => {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
};

const hslToRgb = ({ h, s, l }: HslColor): [number, number, number] => {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = wrapHue(h) / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));

  let r = 0;
  let g = 0;
  let b = 0;

  if (segment >= 0 && segment < 1) [r, g, b] = [chroma, x, 0];
  else if (segment < 2) [r, g, b] = [x, chroma, 0];
  else if (segment < 3) [r, g, b] = [0, chroma, x];
  else if (segment < 4) [r, g, b] = [0, x, chroma];
  else if (segment < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];

  const match = lightness - chroma / 2;
  return [r + match, g + match, b + match].map((channel) =>
    Math.round(channel * 255)
  ) as [number, number, number];
};

const rgbToHex = (rgb: [number, number, number]): string =>
  `#${rgb
    .map((channel) => clamp(channel, 0, 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;

const hslToHex = (hsl: HslColor): string => rgbToHex(hslToRgb(hsl));

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.trim().replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return [0, 0, 0];
  }

  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16)
  ];
};

const rgbToHsl = ([r, g, b]: [number, number, number]): HslColor => {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
  }

  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: wrapHue(hue),
    s: saturation * 100,
    l: lightness * 100
  };
};

const hexToHsl = (hex: string): HslColor => rgbToHsl(hexToRgb(hex));

const averageHue = (colors: HslColor[]): number => {
  if (colors.length === 0) return 0;
  const vectors = colors.map((color) => ({
    x: Math.cos((color.h * Math.PI) / 180),
    y: Math.sin((color.h * Math.PI) / 180)
  }));

  const avgX = vectors.reduce((sum, vector) => sum + vector.x, 0) / vectors.length;
  const avgY = vectors.reduce((sum, vector) => sum + vector.y, 0) / vectors.length;
  if (avgX === 0 && avgY === 0) return 0;
  return wrapHue((Math.atan2(avgY, avgX) * 180) / Math.PI);
};

const getAverageLockedHue = (lockedColors: Array<HslColor | null>): number | null => {
  const locked = lockedColors.filter((color): color is HslColor => color !== null);
  if (locked.length === 0) return null;
  return averageHue(locked);
};

const pickPalette = (
  rand: () => number,
  availablePalettes: PaletteTheme[],
  preferredThemeId?: string
): PaletteTheme => {
  const pool = availablePalettes.length > 0 ? availablePalettes : CURATED_PALETTES;
  if (preferredThemeId) {
    const found = pool.find((theme) => theme.id === preferredThemeId);
    if (found) return found;
  }

  const index = Math.floor(rand() * pool.length);
  return pool[index] ?? pool[0] ?? CURATED_PALETTES[0];
};

const pickFiveFromPalette = (palette: PaletteTheme, rand: () => number): HslColor[] => {
  const base = palette.colors.map((color) => hexToHsl(color));
  if (base.length === 0) {
    return Array.from({ length: 5 }, (_, index) => ({
      h: wrapHue(rand() * 360 + index * 37),
      s: 60 + rand() * 18,
      l: 34 + rand() * 28
    }));
  }

  if (base.length === 5) return [...base];

  if (base.length > 5) {
    const picked: HslColor[] = [];
    const start = Math.floor(rand() * base.length);
    let step = 1 + Math.floor(rand() * Math.max(1, base.length - 1));
    let safety = 0;
    while (gcd(step, base.length) !== 1 && safety < 16) {
      step = (step % Math.max(1, base.length - 1)) + 1;
      safety += 1;
    }

    let cursor = start;
    while (picked.length < 5) {
      picked.push(base[cursor]);
      cursor = (cursor + step) % base.length;
    }
    return picked;
  }

  const expanded = [...base];
  while (expanded.length < 5) {
    const source = expanded[expanded.length % base.length] ?? base[0];
    const target = base[Math.floor(rand() * base.length)] ?? source;
    const blend = 0.35 + rand() * 0.45;
    const hueDelta = shortestHueDelta(source.h, target.h);

    expanded.push({
      // Interpolate hue around the shortest circular path to avoid wheel-wrap artifacts.
      h: wrapHue(source.h + hueDelta * (1 - blend) + (rand() - 0.5) * 28),
      s: clamp(source.s * blend + target.s * (1 - blend) + (rand() - 0.5) * 16, 18, 96),
      l: clamp(source.l * blend + target.l * (1 - blend) + (rand() - 0.5) * 18, 10, 90)
    });
  }

  return expanded.slice(0, 5);
};

export const generatePalette = (
  seed: number,
  lockedColors: Array<HslColor | null>,
  preferredThemeId?: string,
  customThemes: PaletteTheme[] = []
): GeneratedPalette => {
  const rand = mulberry32(seed);
  const mergedThemes = [...CURATED_PALETTES, ...customThemes].filter(
    (theme, index, list) =>
      !!theme &&
      typeof theme.id === "string" &&
      theme.id.length > 0 &&
      typeof theme.name === "string" &&
      Array.isArray(theme.colors) &&
      list.findIndex((entry) => entry.id === theme.id) === index
  );
  const selected = pickPalette(rand, mergedThemes, preferredThemeId);
  const localRand = mulberry32(seed ^ hashString(selected.id));
  const baseColors = pickFiveFromPalette(selected, localRand);

  const anchorHue = getAverageLockedHue(lockedColors);
  const generatedAverageHue = averageHue(baseColors);
  const hueRotation =
    anchorHue === null
      ? (localRand() - 0.5) * 14
      : shortestHueDelta(generatedAverageHue, anchorHue);
  const saturationDrift = (localRand() - 0.5) * 10;
  const lightnessDrift = (localRand() - 0.5) * 10;
  const contrastMode = localRand();

  const generated = baseColors.map((color, index) => {
    const edge = Math.abs(index - 2) / 2;
    const hueNoise = (localRand() - 0.5) * (7 + edge * 6);
    const saturationNoise = (localRand() - 0.5) * (8 + edge * 4);
    const lightnessNoise = (localRand() - 0.5) * (10 + edge * 4);

    const contrastBoost =
      contrastMode > 0.7 ? (index % 2 === 0 ? 8 : -7) : contrastMode < 0.24 ? (index === 2 ? 9 : -3) : 0;

    return {
      h: wrapHue(color.h + hueRotation + hueNoise),
      s: clamp(color.s + saturationDrift + saturationNoise, 14, 97),
      l: clamp(color.l + lightnessDrift + lightnessNoise + contrastBoost, 8, 92)
    };
  });

  const colors = generated.map((candidate, index) => {
    const hsl = lockedColors[index] ?? candidate;
    return {
      hsl,
      hex: hslToHex(hsl)
    };
  });

  return {
    colors,
    themeId: selected.id,
    themeName: selected.name
  };
};

export const makeRandomSeed = (): number =>
  Math.floor(Math.random() * 2_147_483_647);
