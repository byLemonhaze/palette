"use client";

import { useMemo, useRef, useState } from "react";
import type { PaletteColor } from "@/lib/palette";
import { AUTO_THEME_ID } from "@/lib/constants";
import { buildMasterSeed, parseMasterSeed } from "@/lib/seed";

export function useMasterSeed(
  seed: number,
  themeId: string,
  selectedThemeId: string,
  locks: boolean[],
  palette: PaletteColor[],
  allThemeOptions: Array<{ id: string; name: string }>,
  onApply: (params: {
    seed: number;
    palette: PaletteColor[];
    locks: boolean[];
    themeId: string;
    themeName: string;
    selectedThemeId: string;
  }) => void
) {
  const [masterSeedInput, setMasterSeedInput] = useState("");
  const [seedMessage, setSeedMessage] = useState<string | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);

  const currentMasterSeed = useMemo(
    () =>
      buildMasterSeed({
        v: 1,
        seed,
        themeId,
        selectedThemeId,
        locks,
        palette
      }),
    [locks, palette, seed, selectedThemeId, themeId]
  );

  const pushSeedMessage = (message: string) => {
    setSeedMessage(message);
    if (messageTimeoutRef.current !== null) {
      window.clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = window.setTimeout(() => {
      setSeedMessage(null);
      messageTimeoutRef.current = null;
    }, 2200);
  };

  const copyMasterSeed = async () => {
    try {
      await navigator.clipboard.writeText(currentMasterSeed);
      pushSeedMessage("Master seed copied.");
    } catch {
      pushSeedMessage("Clipboard unavailable.");
    }
  };

  const applyMasterSeed = () => {
    const parsed = parseMasterSeed(masterSeedInput);
    if (!parsed) {
      pushSeedMessage("Invalid master seed format.");
      return;
    }

    const knownThemeSelection =
      parsed.selectedThemeId === AUTO_THEME_ID ||
      allThemeOptions.some((theme) => theme.id === parsed.selectedThemeId)
        ? parsed.selectedThemeId
        : AUTO_THEME_ID;

    const resolvedThemeName =
      allThemeOptions.find((theme) => theme.id === parsed.themeId)?.name ?? "Custom";

    onApply({
      seed: parsed.seed,
      palette: parsed.palette,
      locks: parsed.locks,
      themeId: parsed.themeId,
      themeName: resolvedThemeName,
      selectedThemeId: knownThemeSelection
    });
    pushSeedMessage("Master seed loaded.");
  };

  return {
    masterSeedInput,
    setMasterSeedInput,
    seedMessage,
    currentMasterSeed,
    copyMasterSeed,
    applyMasterSeed
  };
}
