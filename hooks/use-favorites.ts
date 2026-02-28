"use client";

import { useEffect, useMemo, useState } from "react";
import type { PaletteColor } from "@/lib/palette";
import { FAVORITES_KEY, MAX_FAVORITES, EMPTY_LOCKS, AUTO_THEME_ID } from "@/lib/constants";
import { isValidFavorites, serializePalette } from "@/lib/validators";

export function useFavorites(
  seed: number,
  themeId: string,
  palette: PaletteColor[],
  currentPaletteKey: string,
  refreshVariantSnapshot: (
    seed: number,
    palette: PaletteColor[],
    locks: boolean[],
    themeId: string,
    themeName: string
  ) => void,
  setDrawerOpen: (open: boolean) => void,
  setPalette: (palette: PaletteColor[]) => void,
  setThemeName: (name: string) => void,
  setSelectedThemeId: (id: string) => void,
  setLocks: (locks: boolean[]) => void
) {
  const [favorites, setFavorites] = useState<PaletteColor[][]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (isValidFavorites(parsed)) {
        setFavorites(parsed.slice(0, MAX_FAVORITES));
      }
    } catch {
      localStorage.removeItem(FAVORITES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const favoriteSet = useMemo(
    () => new Set(favorites.map((entry) => serializePalette(entry))),
    [favorites]
  );

  const isCurrentFavorite = favoriteSet.has(currentPaletteKey);

  const saveFavorite = () => {
    setFavorites((prev) => {
      const deduped = prev.filter((entry) => serializePalette(entry) !== currentPaletteKey);
      const next = [palette, ...deduped];
      return next.slice(0, MAX_FAVORITES);
    });
  };

  const removeFavorite = (index: number) => {
    setFavorites((prev) => prev.filter((_, favoriteIndex) => favoriteIndex !== index));
  };

  const applyFavorite = (favorite: PaletteColor[]) => {
    setPalette(favorite);
    setThemeName("Saved Favorite");
    setSelectedThemeId(AUTO_THEME_ID);
    setLocks([...EMPTY_LOCKS]);
    refreshVariantSnapshot(seed, favorite, [...EMPTY_LOCKS], themeId, "Saved Favorite");
    setDrawerOpen(false);
  };

  return {
    favorites,
    favoriteSet,
    isCurrentFavorite,
    saveFavorite,
    removeFavorite,
    applyFavorite
  };
}
