"use client";

import { useEffect, useRef, useState } from "react";
import type { PaletteColor, PaletteTheme } from "@/lib/palette";
import { CUSTOM_THEMES_KEY, SWATCH_COUNT } from "@/lib/constants";
import {
  buildCustomThemeId,
  normalizeHex,
  parseCustomThemes,
  serializePalette
} from "@/lib/validators";

export function useCustomThemes(
  palette: PaletteColor[],
  allThemeOptions: Array<{ id: string; name: string }>,
  setTheme: (id: string, pool?: PaletteTheme[]) => void
) {
  const [customThemes, setCustomThemes] = useState<PaletteTheme[]>([]);
  const [customThemeName, setCustomThemeName] = useState("");
  const [customThemeColors, setCustomThemeColors] = useState<string[]>(
    palette.map((entry) => entry.hex)
  );
  const [customThemeMessage, setCustomThemeMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      setCustomThemes(parseCustomThemes(parsed));
    } catch {
      localStorage.removeItem(CUSTOM_THEMES_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
  }, [customThemes]);

  useEffect(
    () => () => {
      if (messageTimeoutRef.current !== null) {
        window.clearTimeout(messageTimeoutRef.current);
      }
    },
    []
  );

  const pushCustomThemeMessage = (message: string) => {
    setCustomThemeMessage(message);
    if (messageTimeoutRef.current !== null) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setCustomThemeMessage(null);
      messageTimeoutRef.current = null;
    }, 2600);
  };

  const useCurrentPaletteForCustomTheme = () => {
    setCustomThemeColors(palette.map((entry) => entry.hex));
    pushCustomThemeMessage("Current palette loaded into custom editor.");
  };

  const updateCustomThemeColor = (index: number, value: string) => {
    setCustomThemeColors((prev) =>
      prev.map((entry, colorIndex) => (colorIndex === index ? value.toUpperCase() : entry))
    );
  };

  const saveCustomTheme = () => {
    const trimmedName = customThemeName.trim();
    if (!trimmedName) {
      pushCustomThemeMessage("Name your custom palette first.");
      return;
    }

    const normalizedColors = customThemeColors
      .map((entry) => normalizeHex(entry))
      .filter((entry): entry is string => entry !== null)
      .slice(0, SWATCH_COUNT);

    if (normalizedColors.length !== SWATCH_COUNT) {
      pushCustomThemeMessage("All 5 colors must be valid hex values.");
      return;
    }

    const usedIds = new Set(allThemeOptions.map((entry) => entry.id));
    const nextTheme: PaletteTheme = {
      id: buildCustomThemeId(trimmedName, usedIds),
      name: trimmedName.slice(0, 40),
      colors: normalizedColors
    };

    const nextCustomThemes = [nextTheme, ...customThemes].slice(0, 24);
    setCustomThemes(nextCustomThemes);
    setCustomThemeName("");
    setCustomThemeColors(normalizedColors);
    pushCustomThemeMessage(`Saved "${nextTheme.name}".`);
    setTheme(nextTheme.id, nextCustomThemes);
  };

  const removeCustomTheme = (
    themeIdToRemove: string,
    selectedThemeId: string,
    themeId: string,
    seed: number,
    locks: boolean[],
    generatePaletteWithNoTheme: (
      nextCustomThemes: PaletteTheme[]
    ) => void
  ) => {
    const nextCustomThemes = customThemes.filter((entry) => entry.id !== themeIdToRemove);
    setCustomThemes(nextCustomThemes);

    if (selectedThemeId === themeIdToRemove || themeId === themeIdToRemove) {
      generatePaletteWithNoTheme(nextCustomThemes);
    }

    pushCustomThemeMessage("Custom palette removed.");
  };

  return {
    customThemes,
    setCustomThemes,
    customThemeName,
    setCustomThemeName,
    customThemeColors,
    setCustomThemeColors,
    customThemeMessage,
    pushCustomThemeMessage,
    useCurrentPaletteForCustomTheme,
    updateCustomThemeColor,
    saveCustomTheme,
    removeCustomTheme,
    serializePalette
  };
}
