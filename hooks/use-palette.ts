"use client";

import { useMemo, useState } from "react";
import { generatePalette, makeRandomSeed, PALETTE_THEME_OPTIONS } from "@/lib/palette";
import type { PaletteColor, PaletteTheme } from "@/lib/palette";
import {
  SSR_SEED,
  AUTO_THEME_ID,
  EMPTY_LOCKS,
  makeUnlockedColors
} from "@/lib/constants";
import { deriveIterationSeed } from "@/lib/seed";
import { serializePalette, swapIndices } from "@/lib/validators";
import type { VariantSnapshot } from "@/types/palette";

const getInitialPalette = (seed: number, customThemes: PaletteTheme[] = []) =>
  generatePalette(seed, makeUnlockedColors(), undefined, customThemes);

export function usePalette(customThemes: PaletteTheme[]) {
  const initialGeneration = getInitialPalette(SSR_SEED);

  const [seed, setSeed] = useState(SSR_SEED);
  const [palette, setPalette] = useState<PaletteColor[]>(() => initialGeneration.colors);
  const [themeId, setThemeId] = useState(initialGeneration.themeId);
  const [themeName, setThemeName] = useState(initialGeneration.themeName);
  const [selectedThemeId, setSelectedThemeId] = useState(AUTO_THEME_ID);
  const [locks, setLocks] = useState<boolean[]>(() => [...EMPTY_LOCKS]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variantSnapshot, setVariantSnapshot] = useState<VariantSnapshot>(() => ({
    seed: SSR_SEED,
    basePalette: initialGeneration.colors,
    locks: [...EMPTY_LOCKS],
    themeId: initialGeneration.themeId,
    themeName: initialGeneration.themeName
  }));

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

  const preferredThemeId = selectedThemeId === AUTO_THEME_ID ? themeId : selectedThemeId;

  const currentPaletteKey = useMemo(() => serializePalette(palette), [palette]);

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

  const buildLockedColors = (
    sourcePalette: PaletteColor[],
    sourceLocks: boolean[]
  ) =>
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

  let generatingTimeoutRef: number | null = null;

  const flashGenerating = (durationMs: number) => {
    setIsGenerating(true);
    if (generatingTimeoutRef !== null) {
      window.clearTimeout(generatingTimeoutRef);
    }
    generatingTimeoutRef = window.setTimeout(() => {
      setIsGenerating(false);
      generatingTimeoutRef = null;
    }, durationMs);
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
    const preferredId = nextThemeId === AUTO_THEME_ID ? undefined : nextThemeId;
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(seed, lockedColors, preferredId, themePool);
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

  return {
    seed,
    setSeed,
    palette,
    setPalette,
    themeId,
    setThemeId,
    themeName,
    setThemeName,
    selectedThemeId,
    setSelectedThemeId,
    locks,
    setLocks,
    isGenerating,
    variantSnapshot,
    allThemeOptions,
    preferredThemeId,
    currentPaletteKey,
    studioPreview,
    buildLockedColors,
    refreshVariantSnapshot,
    flashGenerating,
    generateNextPalette,
    iteratePalette,
    setTheme,
    toggleLock,
    movePaletteColor,
    exportCss
  };
}
