"use client";

import { useMemo, useState } from "react";
import { generatePalette } from "@/lib/palette";
import type { PaletteColor, PaletteTheme } from "@/lib/palette";
import { VARIANT_COUNT } from "@/lib/constants";
import { deriveIterationSeed } from "@/lib/seed";
import type { VariantSnapshot } from "@/types/palette";

export function useVariantLab(
  variantSnapshot: VariantSnapshot,
  applyVariant: (variant: {
    seed: number;
    themeId: string;
    themeName: string;
    colors: PaletteColor[];
  }) => void
) {
  const [variantLabOpen, setVariantLabOpen] = useState(true);

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

  return {
    variantLabOpen,
    setVariantLabOpen,
    variantBaseTheme,
    variantPalettes,
    applyVariant
  };
}
