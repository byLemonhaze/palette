"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { generatePalette, makeRandomSeed, PALETTE_THEME_OPTIONS } from "@/lib/palette";
import type { PaletteColor, PaletteTheme } from "@/lib/palette";
import { renderSketchPreview } from "@/lib/sketch-preview";
import {
  SWATCH_COUNT,
  SSR_SEED,
  AUTO_THEME_ID,
  EMPTY_LOCKS,
  makeUnlockedColors,
  VARIANT_COUNT,
  AA_TEXT_TARGET
} from "@/lib/constants";
import { getContrastRatio, getHueSpread } from "@/lib/contrast";
import { deriveIterationSeed, buildMasterSeed, parseMasterSeed } from "@/lib/seed";
import { toneName } from "@/lib/color-names";
import {
  describeHueVariety,
  describeSaturationEnergy,
  describeLightnessDepth,
  describeReadability,
  describeAccessibility
} from "@/lib/analytics";
import {
  isValidFavorites,
  normalizeHex,
  parseCustomThemes,
  buildCustomThemeId,
  serializePalette,
  swapIndices
} from "@/lib/validators";
import { ChevronDownIcon } from "@/components/ui/icons";
import { PaletteSwatch } from "@/components/palette-swatch";
import { VariantLab } from "@/components/variant-lab";
import { MasterSeedPanel } from "@/components/master-seed-panel";
import { CustomThemeEditor } from "@/components/custom-theme-editor";
import { StudioPreview } from "@/components/studio-preview";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { FavoritesDrawer } from "@/components/favorites-drawer";
import { motion } from "framer-motion";
import type { ShowcaseScene, ArtAspect, VariantSnapshot } from "@/types/palette";

const FAVORITES_KEY = "palette-favorites-v1";
const CUSTOM_THEMES_KEY = "palette-custom-themes-v1";
const MAX_FAVORITES = 10;

const getInitialPalette = (seed: number, customThemes: PaletteTheme[] = []) =>
  generatePalette(seed, makeUnlockedColors(), undefined, customThemes);

export default function PaletteExplorer() {
  const initialGeneration = getInitialPalette(SSR_SEED);
  const initialCustomThemeColors = initialGeneration.colors.map((entry) => entry.hex);

  // Core palette state
  const [seed, setSeed] = useState(SSR_SEED);
  const [palette, setPalette] = useState<PaletteColor[]>(() => initialGeneration.colors);
  const [themeId, setThemeId] = useState(initialGeneration.themeId);
  const [themeName, setThemeName] = useState(initialGeneration.themeName);
  const [selectedThemeId, setSelectedThemeId] = useState(AUTO_THEME_ID);
  const [locks, setLocks] = useState<boolean[]>(() => [...EMPTY_LOCKS]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom themes
  const [customThemes, setCustomThemes] = useState<PaletteTheme[]>([]);
  const [customThemeName, setCustomThemeName] = useState("");
  const [customThemeColors, setCustomThemeColors] = useState<string[]>(initialCustomThemeColors);
  const [customThemeMessage, setCustomThemeMessage] = useState<string | null>(null);

  // Variant lab
  const [variantLabOpen, setVariantLabOpen] = useState(true);
  const [variantSnapshot, setVariantSnapshot] = useState<VariantSnapshot>(() => ({
    seed: SSR_SEED,
    basePalette: initialGeneration.colors,
    locks: [...EMPTY_LOCKS],
    themeId: initialGeneration.themeId,
    themeName: initialGeneration.themeName
  }));

  // Studio showcase
  const [showcaseScene, setShowcaseScene] = useState<ShowcaseScene>("frontend");
  const [artAspect, setArtAspect] = useState<ArtAspect>("portrait");
  const [artIteration, setArtIteration] = useState(0);

  // Favorites & drawer
  const [favorites, setFavorites] = useState<PaletteColor[][]>([]);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Master seed
  const [masterSeedInput, setMasterSeedInput] = useState("");
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Refs
  const generatingTimeoutRef = useRef<number | null>(null);
  const seedMessageTimeoutRef = useRef<number | null>(null);
  const customThemeMessageTimeoutRef = useRef<number | null>(null);
  const miniArtworkCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  // Derived
  const allThemeOptions = useMemo(
    () => [
      ...PALETTE_THEME_OPTIONS,
      ...customThemes.map((theme) => ({ id: theme.id, name: `${theme.name} (Custom)` }))
    ],
    [customThemes]
  );
  const preferredThemeId = selectedThemeId === AUTO_THEME_ID ? themeId : selectedThemeId;
  const currentPaletteKey = useMemo(() => serializePalette(palette), [palette]);
  const favoriteSet = useMemo(
    () => new Set(favorites.map((entry) => serializePalette(entry))),
    [favorites]
  );
  const isCurrentFavorite = favoriteSet.has(currentPaletteKey);
  const toneNames = useMemo(
    () => palette.map((color, index) => toneName(color.hsl, index, seed)),
    [palette, seed]
  );
  const contrastMatrix = useMemo(
    () => palette.map((rowColor) => palette.map((colColor) => getContrastRatio(rowColor.hex, colColor.hex))),
    [palette]
  );
  const studioPreview = useMemo(() => {
    const p = (i: number) => palette[i] ?? palette[0]!;
    return { dark: p(0), surface: p(1), base: p(2), light: p(3), accent: p(4) ?? p(2), accentAlt: p(2) };
  }, [palette]);
  const miniArtworkAspectRatio =
    artAspect === "square" ? "1 / 1" : artAspect === "portrait" ? "5 / 7" : "7 / 5";
  const currentMasterSeed = useMemo(
    () => buildMasterSeed({ v: 1, seed, themeId, selectedThemeId, locks, palette }),
    [locks, palette, seed, selectedThemeId, themeId]
  );
  const variantBaseTheme = useMemo<PaletteTheme>(
    () => ({ id: "__variant-base", name: "Variant Base", colors: variantSnapshot.basePalette.map((c) => c.hex) }),
    [variantSnapshot.basePalette]
  );
  const variantPalettes = useMemo(() => {
    const lockedColors = variantSnapshot.basePalette.map((color, index) =>
      variantSnapshot.locks[index] ? color.hsl : null
    );
    return Array.from({ length: VARIANT_COUNT }, (_, index) => {
      const mixed = (variantSnapshot.seed + Math.imul(index + 1, 2654435761)) >>> 0;
      const variantSeed = deriveIterationSeed(mixed || variantSnapshot.seed + index + 1);
      const generated = generatePalette(variantSeed, lockedColors, variantBaseTheme.id, [variantBaseTheme]);
      return { seed: variantSeed, themeId: variantSnapshot.themeId, themeName: variantSnapshot.themeName, colors: generated.colors };
    });
  }, [variantBaseTheme, variantSnapshot]);

  const analyticsSummary = useMemo(() => {
    const hues = palette.map((e) => e.hsl.h);
    const saturations = palette.map((e) => e.hsl.s);
    const lightnessValues = palette.map((e) => e.hsl.l);
    let minContrast = Infinity, maxContrast = -Infinity, contrastTotal = 0, contrastCount = 0, aaPassingPairs = 0;
    let minPair: [number, number] = [0, 0], maxPair: [number, number] = [0, 0];
    for (let row = 0; row < contrastMatrix.length; row++) {
      for (let col = row + 1; col < contrastMatrix.length; col++) {
        const ratio = contrastMatrix[row]?.[col] ?? 1;
        contrastTotal += ratio; contrastCount += 1;
        if (ratio < minContrast) { minContrast = ratio; minPair = [row, col]; }
        if (ratio > maxContrast) { maxContrast = ratio; maxPair = [row, col]; }
        if (ratio >= AA_TEXT_TARGET) aaPassingPairs += 1;
      }
    }
    const averageContrast = contrastCount > 0 ? contrastTotal / contrastCount : 1;
    return {
      hueSpread: getHueSpread(hues),
      saturationRange: Math.max(...saturations) - Math.min(...saturations),
      lightnessRange: Math.max(...lightnessValues) - Math.min(...lightnessValues),
      averageContrast,
      minContrast: isFinite(minContrast) ? minContrast : 1,
      maxContrast: isFinite(maxContrast) ? maxContrast : 1,
      minPair, maxPair,
      aaPassRate: contrastCount > 0 ? (aaPassingPairs / contrastCount) * 100 : 0,
      aaPassingPairs, totalPairs: contrastCount
    };
  }, [contrastMatrix, palette]);

  const analyticsNarrative = useMemo(() => {
    const variety = describeHueVariety(analyticsSummary.hueSpread);
    const energy = describeSaturationEnergy(analyticsSummary.saturationRange);
    const depth = describeLightnessDepth(analyticsSummary.lightnessRange);
    const readability = describeReadability(analyticsSummary.averageContrast);
    const accessibility = describeAccessibility(analyticsSummary.aaPassRate);
    const tip = accessibility.tone === "strong"
      ? "Most pairings are text-safe. Use this palette flexibly."
      : accessibility.tone === "balanced"
        ? "Use the highest-contrast pair for body text."
        : "Reserve low-contrast pairs for decoration only.";
    return {
      variety, energy, depth, readability, accessibility,
      strongestPair: { a: analyticsSummary.maxPair[0], b: analyticsSummary.maxPair[1], ratio: analyticsSummary.maxContrast },
      weakestPair: { a: analyticsSummary.minPair[0], b: analyticsSummary.minPair[1], ratio: analyticsSummary.minContrast },
      tip
    };
  }, [analyticsSummary]);

  // Helpers
  const buildLockedColors = (srcPalette: PaletteColor[], srcLocks: boolean[]) =>
    srcPalette.map((color, index) => (srcLocks[index] ? color.hsl : null));

  const refreshVariantSnapshot = (srcSeed: number, srcPalette: PaletteColor[], srcLocks: boolean[], srcThemeId: string, srcThemeName: string) => {
    setVariantSnapshot({ seed: srcSeed, basePalette: srcPalette, locks: srcLocks, themeId: srcThemeId, themeName: srcThemeName });
  };

  const flashGenerating = (ms: number) => {
    setIsGenerating(true);
    if (generatingTimeoutRef.current !== null) window.clearTimeout(generatingTimeoutRef.current);
    generatingTimeoutRef.current = window.setTimeout(() => { setIsGenerating(false); generatingTimeoutRef.current = null; }, ms);
  };

  const pushSeedMessage = (msg: string) => {
    setSeedMessage(msg);
    if (seedMessageTimeoutRef.current !== null) window.clearTimeout(seedMessageTimeoutRef.current);
    seedMessageTimeoutRef.current = window.setTimeout(() => { setSeedMessage(null); seedMessageTimeoutRef.current = null; }, 2200);
  };

  const pushCustomThemeMessage = (msg: string) => {
    setCustomThemeMessage(msg);
    if (customThemeMessageTimeoutRef.current !== null) window.clearTimeout(customThemeMessageTimeoutRef.current);
    customThemeMessageTimeoutRef.current = window.setTimeout(() => { setCustomThemeMessage(null); customThemeMessageTimeoutRef.current = null; }, 2600);
  };

  // Init effects
  useEffect(() => {
    const nextSeed = makeRandomSeed();
    const generated = getInitialPalette(nextSeed);
    setSeed(nextSeed); setPalette(generated.colors); setThemeId(generated.themeId); setThemeName(generated.themeName);
    setVariantSnapshot({ seed: nextSeed, basePalette: generated.colors, locks: [...EMPTY_LOCKS], themeId: generated.themeId, themeName: generated.themeName });
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (isValidFavorites(parsed)) setFavorites(parsed.slice(0, MAX_FAVORITES));
    } catch { localStorage.removeItem(FAVORITES_KEY); }
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      setCustomThemes(parseCustomThemes(parsed));
    } catch { localStorage.removeItem(CUSTOM_THEMES_KEY); }
  }, []);

  useEffect(() => { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes)); }, [customThemes]);

  useEffect(() => () => {
    if (generatingTimeoutRef.current !== null) window.clearTimeout(generatingTimeoutRef.current);
    if (seedMessageTimeoutRef.current !== null) window.clearTimeout(seedMessageTimeoutRef.current);
    if (customThemeMessageTimeoutRef.current !== null) window.clearTimeout(customThemeMessageTimeoutRef.current);
  }, []);

  // Canvas effect
  useEffect(() => {
    if (showcaseScene !== "art") return;
    let rafId: number | null = null;
    const draw = () => {
      miniArtworkCanvasRefs.current.forEach((canvas, index) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const w = Math.max(120, Math.floor(canvas.clientWidth));
        const h = Math.max(120, Math.floor(canvas.clientHeight));
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const mixedSeed = (seed + artIteration * 104_729 + Math.imul(index + 1, 2_654_435_761)) >>> 0;
        const variantSeed = deriveIterationSeed(mixedSeed || seed + index + 1);
        const rotatedPalette = palette.map((_, si) => palette[(si + index) % palette.length]?.hex ?? palette[0]?.hex ?? "#2F3542");
        renderSketchPreview(ctx, w, h, rotatedPalette, variantSeed, { minWidth: 0, minHeight: 0, plainCantext: true });
      });
    };
    const schedule = () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => { rafId = null; draw(); });
    };
    schedule();
    window.addEventListener("resize", schedule);
    return () => { window.removeEventListener("resize", schedule); if (rafId !== null) window.cancelAnimationFrame(rafId); };
  }, [artAspect, artIteration, palette, seed, showcaseScene]);

  // Actions
  const generateNextPalette = () => {
    const nextSeed = makeRandomSeed();
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(nextSeed, lockedColors, selectedThemeId === AUTO_THEME_ID ? undefined : selectedThemeId, customThemes);
    setSeed(nextSeed); setPalette(generated.colors); setThemeId(generated.themeId); setThemeName(generated.themeName);
    refreshVariantSnapshot(nextSeed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(480);
  };

  const iteratePalette = () => {
    const nextSeed = deriveIterationSeed(seed);
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(nextSeed, lockedColors, preferredThemeId === AUTO_THEME_ID ? undefined : preferredThemeId, customThemes);
    setSeed(nextSeed); setPalette(generated.colors); setThemeId(generated.themeId); setThemeName(generated.themeName);
    refreshVariantSnapshot(nextSeed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(420);
  };

  const setTheme = (nextThemeId: string, themePoolOverride?: PaletteTheme[]) => {
    setSelectedThemeId(nextThemeId);
    const pool = themePoolOverride ?? customThemes;
    const lockedColors = buildLockedColors(palette, locks);
    const generated = generatePalette(seed, lockedColors, nextThemeId === AUTO_THEME_ID ? undefined : nextThemeId, pool);
    setPalette(generated.colors); setThemeId(generated.themeId); setThemeName(generated.themeName);
    refreshVariantSnapshot(seed, generated.colors, locks, generated.themeId, generated.themeName);
    flashGenerating(420);
  };

  const toggleLock = (index: number) => {
    setLocks((prev) => {
      const nextLocks = prev.map((locked, i) => i === index ? !locked : locked);
      refreshVariantSnapshot(seed, palette, nextLocks, themeId, themeName);
      return nextLocks;
    });
  };

  const copyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      window.setTimeout(() => setCopiedHex((v) => v === hex ? null : v), 1300);
    } catch { setCopiedHex(null); }
  };

  const copyMasterSeed = async () => {
    try { await navigator.clipboard.writeText(currentMasterSeed); pushSeedMessage("Master seed copied."); }
    catch { pushSeedMessage("Clipboard unavailable."); }
  };

  const applyMasterSeed = () => {
    const parsed = parseMasterSeed(masterSeedInput);
    if (!parsed) { pushSeedMessage("Invalid master seed format."); return; }
    const knownTheme = parsed.selectedThemeId === AUTO_THEME_ID || allThemeOptions.some((t) => t.id === parsed.selectedThemeId)
      ? parsed.selectedThemeId : AUTO_THEME_ID;
    const resolvedName = allThemeOptions.find((t) => t.id === parsed.themeId)?.name ?? "Custom";
    setSeed(parsed.seed); setPalette(parsed.palette); setLocks(parsed.locks);
    setThemeId(parsed.themeId); setThemeName(resolvedName); setSelectedThemeId(knownTheme);
    refreshVariantSnapshot(parsed.seed, parsed.palette, parsed.locks, parsed.themeId, resolvedName);
    setDrawerOpen(false); flashGenerating(420); pushSeedMessage("Master seed loaded.");
  };

  const saveFavorite = () => {
    setFavorites((prev) => {
      const deduped = prev.filter((e) => serializePalette(e) !== currentPaletteKey);
      return [palette, ...deduped].slice(0, MAX_FAVORITES);
    });
  };

  const removeFavorite = (index: number) => setFavorites((prev) => prev.filter((_, i) => i !== index));

  const applyFavorite = (favorite: PaletteColor[]) => {
    setPalette(favorite); setThemeName("Saved Favorite"); setSelectedThemeId(AUTO_THEME_ID);
    setLocks([...EMPTY_LOCKS]);
    refreshVariantSnapshot(seed, favorite, [...EMPTY_LOCKS], themeId, "Saved Favorite");
    setDrawerOpen(false);
  };

  const applyVariant = (variant: { seed: number; themeId: string; themeName: string; colors: PaletteColor[] }) => {
    setSeed(variant.seed); setPalette(variant.colors); setThemeId(variant.themeId); setThemeName(variant.themeName);
    setDrawerOpen(false); flashGenerating(360);
  };

  const movePaletteColor = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= palette.length) return;
    setPalette((prev) => swapIndices(prev, index, target));
    setLocks((prev) => swapIndices(prev, index, target));
  };

  const exportCss = () => {
    const css = `:root {\n${palette.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join("\n")}\n}\n`;
    const blob = new Blob([css], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "palette.css"; a.click();
    URL.revokeObjectURL(url);
  };

  const useCurrentPaletteForCustomTheme = () => {
    setCustomThemeColors(palette.map((e) => e.hex));
    pushCustomThemeMessage("Current palette loaded into custom editor.");
  };

  const updateCustomThemeColor = (index: number, value: string) => {
    setCustomThemeColors((prev) => prev.map((e, i) => i === index ? value.toUpperCase() : e));
  };

  const saveCustomTheme = () => {
    const trimmedName = customThemeName.trim();
    if (!trimmedName) { pushCustomThemeMessage("Name your custom palette first."); return; }
    const normalizedColors = customThemeColors.map((e) => normalizeHex(e)).filter((e): e is string => e !== null).slice(0, SWATCH_COUNT);
    if (normalizedColors.length !== SWATCH_COUNT) { pushCustomThemeMessage("All 5 colors must be valid hex values."); return; }
    const usedIds = new Set(allThemeOptions.map((e) => e.id));
    const nextTheme: PaletteTheme = { id: buildCustomThemeId(trimmedName, usedIds), name: trimmedName.slice(0, 40), colors: normalizedColors };
    const nextCustomThemes = [nextTheme, ...customThemes].slice(0, 24);
    setCustomThemes(nextCustomThemes); setCustomThemeName(""); setCustomThemeColors(normalizedColors);
    pushCustomThemeMessage(`Saved "${nextTheme.name}".`);
    setTheme(nextTheme.id, nextCustomThemes);
  };

  const removeCustomTheme = (themeIdToRemove: string) => {
    const next = customThemes.filter((e) => e.id !== themeIdToRemove);
    setCustomThemes(next);
    if (selectedThemeId === themeIdToRemove || themeId === themeIdToRemove) {
      const lockedColors = palette.map((c, i) => locks[i] ? c.hsl : null);
      const generated = generatePalette(seed, lockedColors, undefined, next);
      setSelectedThemeId(AUTO_THEME_ID); setPalette(generated.colors); setThemeId(generated.themeId); setThemeName(generated.themeName);
    }
    pushCustomThemeMessage("Custom palette removed.");
  };

  return (
    <div className="relative min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5 lg:px-8 lg:py-8">
        <main className="flex flex-col gap-6 border border-[#1C1C1E] p-4 sm:p-6">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#1C1C1E] pb-5">
            <div className="space-y-1">
              <p className="font-display text-[10px] uppercase tracking-[0.28em] text-[#444]">
                Palette by Lemonhaze
              </p>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-[-0.02em] text-[#EDEDED]">
                Palette Engine
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                <p className="font-mono text-xs text-[#444]">seed:{seed}</p>
                <p className="font-display text-xs uppercase tracking-[0.14em] text-[#666]">
                  {themeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="theme-select">Select palette theme</label>
              <div className="relative">
                <select
                  id="theme-select"
                  value={selectedThemeId}
                  onChange={(event) => setTheme(event.target.value)}
                  className="appearance-none border border-[#2A2A2A] bg-[#0E0E0F] pl-3 pr-9 py-2 font-display text-sm text-[#CCC] outline-none transition hover:border-[#444]"
                >
                  <option value={AUTO_THEME_ID}>Auto Theme</option>
                  {allThemeOptions.map((theme) => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 inline-flex items-center text-[#555]">
                  <ChevronDownIcon />
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen((open) => !open)}
                className="btn-ghost px-3 py-2 text-sm lg:hidden"
              >
                Saved ({favorites.length})
              </button>
            </div>
          </header>

          {/* Swatch strip */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="section-label">Palette</p>
              <p className="font-mono text-[11px] text-[#444]">lock colors to keep them on generate</p>
            </div>
            <motion.div
              className={`grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5 transition-opacity duration-300 ${isGenerating ? "opacity-75" : "opacity-100"}`}
              layout
            >
              {palette.map((color, index) => (
                <motion.div
                  key={`swatch-${index}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: index * 0.04 }}
                >
                  <PaletteSwatch
                    color={color}
                    index={index}
                    toneName={toneNames[index] ?? ""}
                    isLocked={locks[index] ?? false}
                    isCopied={copiedHex === color.hex}
                    onCopy={copyHex}
                    onLock={toggleLock}
                    onMoveUp={() => movePaletteColor(index, -1)}
                    onMoveDown={() => movePaletteColor(index, 1)}
                    canMoveUp={index > 0}
                    canMoveDown={index < palette.length - 1}
                  />
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Variant lab */}
          <VariantLab
            variantPalettes={variantPalettes}
            variantLabOpen={variantLabOpen}
            currentPaletteKey={currentPaletteKey}
            onToggle={() => setVariantLabOpen((open) => !open)}
            onApply={applyVariant}
          />

          {/* Action footer */}
          <footer className="flex flex-wrap items-center gap-3 border-t border-[#1C1C1E] pt-4">
            <button type="button" onClick={generateNextPalette} className="btn-primary">
              Generate
            </button>
            <button type="button" onClick={iteratePalette} className="btn-ghost px-4 py-2.5 text-sm">
              Iterate
            </button>
            <button
              type="button"
              onClick={saveFavorite}
              className={`btn-ghost px-4 py-2.5 text-sm ${isCurrentFavorite ? "border-[#444] text-[#EEE]" : ""}`}
            >
              {isCurrentFavorite ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={exportCss} className="btn-ghost px-4 py-2.5 text-sm">
              Export CSS
            </button>
            <p className="ml-auto font-mono text-[11px] text-[#444]">
              Generate = new seed. Iterate = deterministic next.
            </p>
          </footer>

          {/* Master seed */}
          <MasterSeedPanel
            currentMasterSeed={currentMasterSeed}
            masterSeedInput={masterSeedInput}
            seedMessage={seedMessage}
            onMasterSeedInputChange={setMasterSeedInput}
            onCopy={copyMasterSeed}
            onApply={applyMasterSeed}
          />

          {/* Custom theme editor */}
          <CustomThemeEditor
            customThemes={customThemes}
            customThemeName={customThemeName}
            customThemeColors={customThemeColors}
            customThemeMessage={customThemeMessage}
            onNameChange={setCustomThemeName}
            onColorChange={updateCustomThemeColor}
            onColorBlur={(index, value) => {
              const normalized = normalizeHex(value);
              if (normalized) updateCustomThemeColor(index, normalized);
            }}
            onUseCurrent={useCurrentPaletteForCustomTheme}
            onSave={saveCustomTheme}
            onApplyTheme={setTheme}
            onRemoveTheme={removeCustomTheme}
          />

          {/* Studio showcase */}
          <StudioPreview
            palette={palette}
            toneNames={toneNames}
            themeName={themeName}
            seed={seed}
            studioPreview={studioPreview}
            showcaseScene={showcaseScene}
            artAspect={artAspect}
            artIteration={artIteration}
            miniArtworkAspectRatio={miniArtworkAspectRatio}
            miniArtworkCanvasRefs={miniArtworkCanvasRefs}
            onSceneChange={setShowcaseScene}
            onArtAspectChange={setArtAspect}
            onRefreshArt={() => setArtIteration((prev) => prev + 1)}
            onMoveColor={movePaletteColor}
          />

          {/* Analytics */}
          <AnalyticsPanel
            palette={palette}
            contrastMatrix={contrastMatrix}
            analyticsSummary={analyticsSummary}
            analyticsNarrative={analyticsNarrative}
          />
        </main>

        <FavoritesDrawer
          favorites={favorites}
          drawerOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onApply={applyFavorite}
          onRemove={removeFavorite}
          onCopyHex={copyHex}
        />
      </div>

      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-[#0A0A0B]/80 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close favorites drawer"
        />
      )}
    </div>
  );
}
