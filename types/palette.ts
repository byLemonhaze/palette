import type { PaletteColor } from "@/lib/palette";

export type { MasterSeedPayload } from "@/lib/seed";

export type VariantSnapshot = {
  seed: number;
  basePalette: PaletteColor[];
  locks: boolean[];
  themeId: string;
  themeName: string;
};

export type ShowcaseScene = "frontend" | "commerce" | "mobile" | "art";
export type ArtAspect = "square" | "portrait" | "landscape";

export const SHOWCASE_SCENES: Array<{ id: ShowcaseScene; label: string }> = [
  { id: "frontend", label: "Front-end Design" },
  { id: "commerce", label: "E-commerce Shop" },
  { id: "mobile", label: "Mobile App" },
  { id: "art", label: "Mini Artwork Mockup" }
];
