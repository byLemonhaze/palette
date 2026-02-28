"use client";

import { useEffect, useRef, useState } from "react";
import type { PaletteColor } from "@/lib/palette";
import { MINI_ARTWORK_COUNT } from "@/lib/constants";
import { deriveIterationSeed } from "@/lib/seed";
import { renderSketchPreview } from "@/lib/sketch-preview";
import type { ArtAspect, ShowcaseScene } from "@/types/palette";

export function useSketchCanvas(
  seed: number,
  palette: PaletteColor[],
  showcaseScene: ShowcaseScene
) {
  const [artIteration, setArtIteration] = useState(0);
  const [artAspect, setArtAspect] = useState<ArtAspect>("portrait");
  const miniArtworkCanvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  const miniArtworkAspectRatio =
    artAspect === "square" ? "1 / 1" : artAspect === "portrait" ? "5 / 7" : "7 / 5";

  useEffect(() => {
    if (showcaseScene !== "art") return;

    let rafId: number | null = null;
    const drawMiniArtworks = () => {
      miniArtworkCanvasRefs.current.forEach((canvas, index) => {
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const width = Math.max(120, Math.floor(canvas.clientWidth));
        const height = Math.max(120, Math.floor(canvas.clientHeight));
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);

        const mixedSeed =
          (seed + artIteration * 104_729 + Math.imul(index + 1, 2_654_435_761)) >>> 0;
        const variantSeed = deriveIterationSeed(mixedSeed || seed + index + 1);
        const rotatedPalette = palette.map(
          (_, swatchIndex) =>
            palette[(swatchIndex + index) % palette.length]?.hex ?? palette[0]?.hex ?? "#2F3542"
        );

        renderSketchPreview(context, width, height, rotatedPalette, variantSeed, {
          minWidth: 0,
          minHeight: 0,
          plainCantext: true
        });
      });
    };

    const scheduleDraw = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        drawMiniArtworks();
      });
    };

    scheduleDraw();
    window.addEventListener("resize", scheduleDraw);
    return () => {
      window.removeEventListener("resize", scheduleDraw);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [artAspect, artIteration, palette, seed, showcaseScene]);

  const refreshMiniArtwork = () => {
    setArtIteration((prev) => prev + 1);
  };

  return {
    artIteration,
    artAspect,
    setArtAspect,
    miniArtworkCanvasRefs,
    miniArtworkAspectRatio,
    refreshMiniArtwork,
    MINI_ARTWORK_COUNT,
    deriveIterationSeed
  };
}
