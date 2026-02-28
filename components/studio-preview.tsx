import type { PaletteColor } from "@/lib/palette";
import { getReadableTextColor } from "@/lib/contrast";
import { PIXEL_GARMENT_MAP } from "@/lib/constants";
import { SHOWCASE_SCENES } from "@/types/palette";
import type { ShowcaseScene, ArtAspect } from "@/types/palette";
import { MINI_ARTWORK_COUNT } from "@/lib/constants";
import { deriveIterationSeed } from "@/lib/seed";

type StudioPreviewColors = {
  dark: PaletteColor;
  surface: PaletteColor;
  base: PaletteColor;
  light: PaletteColor;
  accent: PaletteColor;
  accentAlt: PaletteColor;
};

type StudioPreviewProps = {
  palette: PaletteColor[];
  toneNames: string[];
  themeName: string;
  seed: number;
  studioPreview: StudioPreviewColors;
  showcaseScene: ShowcaseScene;
  artAspect: ArtAspect;
  artIteration: number;
  miniArtworkAspectRatio: string;
  miniArtworkCanvasRefs: React.MutableRefObject<Array<HTMLCanvasElement | null>>;
  onSceneChange: (scene: ShowcaseScene) => void;
  onArtAspectChange: (aspect: ArtAspect) => void;
  onRefreshArt: () => void;
  onMoveColor: (index: number, direction: -1 | 1) => void;
};

export function StudioPreview({
  palette,
  toneNames,
  themeName,
  seed,
  studioPreview,
  showcaseScene,
  artAspect,
  artIteration,
  miniArtworkAspectRatio,
  miniArtworkCanvasRefs,
  onSceneChange,
  onArtAspectChange,
  onRefreshArt,
  onMoveColor
}: StudioPreviewProps) {
  return (
    <section className="section-panel">
      <div className="section-header mb-3">
        <h2 className="section-label">Studio Showcase</h2>
        <span className="section-sublabel font-mono">
          {SHOWCASE_SCENES.find((scene) => scene.id === showcaseScene)?.label}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SHOWCASE_SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSceneChange(scene.id)}
            className={`border px-2.5 py-1.5 font-display text-[11px] uppercase tracking-[0.1em] transition ${
              showcaseScene === scene.id
                ? "border-[#EEE] text-[#EEE]"
                : "border-[#2A2A2A] text-[#666] hover:border-[#444] hover:text-[#AAA]"
            }`}
          >
            {scene.label}
          </button>
        ))}
      </div>

      {showcaseScene === "frontend" && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article
            className="border border-[#1C1C1E] p-4"
            style={{
              background: `linear-gradient(145deg, ${studioPreview.dark.hex}, ${studioPreview.surface.hex})`
            }}
          >
            <div className="mb-6 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.12em]">
              <span style={{ color: getReadableTextColor(studioPreview.surface.hex) }}>
                Creative Studio
              </span>
              <span
                style={{
                  color: getReadableTextColor(studioPreview.surface.hex),
                  opacity: 0.7
                }}
              >
                {themeName}
              </span>
            </div>
            <div className="space-y-4">
              <p
                className="font-display text-xs uppercase tracking-[0.12em]"
                style={{ color: getReadableTextColor(studioPreview.dark.hex), opacity: 0.8 }}
              >
                Landing Hero
              </p>
              <h3
                className="max-w-md font-display text-xl font-bold leading-tight"
                style={{ color: getReadableTextColor(studioPreview.dark.hex) }}
              >
                Build coherent interface systems from one palette seed.
              </h3>
              <p
                className="max-w-lg text-sm"
                style={{
                  color: getReadableTextColor(studioPreview.surface.hex),
                  opacity: 0.8
                }}
              >
                Flat and readable composition for product websites and creative portfolios.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.08em]"
                  style={{
                    backgroundColor: studioPreview.accent.hex,
                    color: getReadableTextColor(studioPreview.accent.hex)
                  }}
                >
                  Primary CTA
                </button>
                <button
                  type="button"
                  className="border px-3 py-2 font-display text-xs uppercase tracking-[0.08em]"
                  style={{
                    borderColor: `${studioPreview.light.hex}AA`,
                    color: getReadableTextColor(studioPreview.surface.hex)
                  }}
                >
                  Secondary
                </button>
              </div>
            </div>
          </article>

          <div className="grid gap-3">
            <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
              <p className="mb-2 font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
                Component Kit
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-2.5 py-1.5 font-display text-[11px] font-bold"
                  style={{
                    backgroundColor: studioPreview.accentAlt.hex,
                    color: getReadableTextColor(studioPreview.accentAlt.hex)
                  }}
                >
                  Action
                </button>
                <span
                  className="border px-2 py-1 font-display text-[10px]"
                  style={{
                    borderColor: `${studioPreview.light.hex}80`,
                    color: studioPreview.light.hex
                  }}
                >
                  Tag
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {palette.slice(0, 3).map((color, index) => (
                  <div
                    key={`showcase-row-${color.hex}-${index}`}
                    className="flex items-center gap-2 border border-[#1C1C1E] px-2 py-1.5"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/30"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="font-mono text-[10px] text-[#888]">{color.hex}</span>
                    <span className="ml-auto text-[10px] text-[#555]">{toneNames[index]}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
                  Color Rhythm
                </p>
                <p className="text-[10px] text-[#444]">Reorder to remap showcase roles</p>
              </div>
              <div className="space-y-1.5">
                {palette.map((color, index) => (
                  <div
                    key={`rhythm-${color.hex}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="w-5 text-[10px] text-[#555]">{index + 1}</span>
                    <span
                      className="h-4"
                      style={{
                        width: `${34 + color.hsl.s * 0.62}%`,
                        backgroundColor: color.hex
                      }}
                    />
                    <div className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onMoveColor(index, -1)}
                        disabled={index === 0}
                        className="border border-[#1C1C1E] px-1.5 py-0.5 text-[10px] text-[#555] disabled:opacity-25 hover:text-[#CCC]"
                        aria-label={`Move color ${index + 1} up`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveColor(index, 1)}
                        disabled={index === palette.length - 1}
                        className="border border-[#1C1C1E] px-1.5 py-0.5 text-[10px] text-[#555] disabled:opacity-25 hover:text-[#CCC]"
                        aria-label={`Move color ${index + 1} down`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      )}

      {showcaseScene === "commerce" && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <article className="border border-[#1C1C1E] bg-[#0A0A0B] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-[#EEE]">Sketch Atelier</h3>
                <p className="font-display text-[10px] uppercase tracking-[0.12em] text-[#555]">
                  Capsule drop powered by palette
                </p>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 font-display text-[10px] font-bold uppercase"
                style={{
                  backgroundColor: studioPreview.accent.hex,
                  color: getReadableTextColor(studioPreview.accent.hex)
                }}
              >
                View Cart
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {palette.slice(0, 3).map((color, index) => (
                <div
                  key={`commerce-product-${color.hex}-${index}`}
                  className="border border-[#1C1C1E] p-2"
                  style={{ backgroundColor: `${studioPreview.surface.hex}25` }}
                >
                  <div className="mb-2 border border-black/25 bg-[#0A0A0B] p-1.5">
                    <div className="mx-auto grid w-[74px] grid-cols-10 gap-[1px] bg-black/25 p-1">
                      {PIXEL_GARMENT_MAP.flatMap((row, rowIndex) =>
                        row.split("").map((pixel, pixelIndex) => (
                          <span
                            key={`garment-${index}-${rowIndex}-${pixelIndex}`}
                            className="h-[5px] w-[5px]"
                            style={{
                              backgroundColor:
                                pixel === "1"
                                  ? index % 2 === 0
                                    ? color.hex
                                    : studioPreview.accentAlt.hex
                                  : "rgba(0,0,0,0.14)"
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                  <p className="font-display text-[11px] text-[#CCC]">Sketch Tee #{index + 1}</p>
                  <p className="font-display text-[10px] text-[#555]">{themeName} Edition</p>
                  <p className="font-mono text-[10px] text-[#666]">${(index + 1) * 79}.00</p>
                </div>
              ))}
            </div>
          </article>

          <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
            <p className="mb-2 font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
              Checkout UI
            </p>
            <div className="space-y-2">
              {["Shipping method", "Billing information", "Promo: SKETCHLOVE-10"].map(
                (label) => (
                  <div
                    key={label}
                    className="border border-[#1C1C1E] p-2 text-[11px] text-[#888]"
                  >
                    {label}
                  </div>
                )
              )}
              <button
                type="button"
                className="w-full py-2 font-display text-[11px] font-bold uppercase tracking-[0.1em]"
                style={{
                  backgroundColor: studioPreview.accentAlt.hex,
                  color: getReadableTextColor(studioPreview.accentAlt.hex)
                }}
              >
                Complete Purchase
              </button>
            </div>
          </article>
        </div>
      )}

      {showcaseScene === "mobile" && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <article className="flex items-center justify-center border border-[#1C1C1E] bg-[#0A0A0B] p-4">
            <div className="w-60 border border-[#333] bg-[#0A0A0A] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <div
                className="h-[430px] p-3"
                style={{ backgroundColor: studioPreview.surface.hex }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: getReadableTextColor(studioPreview.surface.hex) }}
                  >
                    9:41
                  </span>
                  <span
                    className="font-display text-[10px] uppercase tracking-[0.1em]"
                    style={{ color: getReadableTextColor(studioPreview.surface.hex) }}
                  >
                    Palette App
                  </span>
                </div>
                <div className="space-y-2">
                  {palette.slice(0, 4).map((color, index) => (
                    <div
                      key={`mobile-tile-${color.hex}-${index}`}
                      className="border border-black/20 p-2"
                      style={{
                        backgroundColor: color.hex,
                        color: getReadableTextColor(color.hex)
                      }}
                    >
                      <p className="font-display text-[11px] font-bold">Card {index + 1}</p>
                      <p className="font-mono text-[10px]">{color.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
            <p className="mb-2 font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
              Mobile Tokens
            </p>
            <div className="space-y-2">
              {palette.map((color, index) => (
                <div
                  key={`mobile-token-${color.hex}-${index}`}
                  className="flex items-center gap-2 border border-[#1C1C1E] px-2 py-1.5"
                >
                  <span
                    className="h-4 w-4 border border-black/30"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="font-display text-[11px] text-[#888]">Level {index + 1}</span>
                  <span className="ml-auto font-mono text-[10px] text-[#555]">{color.hex}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {showcaseScene === "art" && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
            <p className="mb-2 font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
              Sketch Micro Generator
            </p>
            <div className="space-y-2">
              <input
                type="text"
                readOnly
                value={`prompt: sketch study, palette ${themeName}`}
                className="input-field font-mono text-[11px]"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="border border-[#1C1C1E] px-2 py-1.5 font-mono text-[10px] text-[#555]">
                  seed: {seed}
                </div>
                <div className="border border-[#1C1C1E] px-2 py-1.5 font-mono text-[10px] text-[#555]">
                  studies: {MINI_ARTWORK_COUNT}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["portrait", "5:7"],
                    ["square", "1:1"],
                    ["landscape", "7:5"]
                  ] as Array<[ArtAspect, string]>
                ).map(([id, label]) => (
                  <button
                    key={`art-aspect-${id}`}
                    type="button"
                    onClick={() => onArtAspectChange(id)}
                    className={`border px-2 py-1 font-display text-[10px] uppercase tracking-[0.1em] transition ${
                      artAspect === id
                        ? "border-[#EEE] text-[#EEE]"
                        : "border-[#2A2A2A] text-[#555] hover:border-[#444] hover:text-[#AAA]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={onRefreshArt}
                className="px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.08em]"
                style={{
                  backgroundColor: studioPreview.accent.hex,
                  color: getReadableTextColor(studioPreview.accent.hex)
                }}
              >
                Re-roll Mini Sketch
              </button>
            </div>
          </article>

          <article className="border border-[#1C1C1E] bg-[#0A0A0B] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-[10px] uppercase tracking-[0.12em] text-[#666]">
                Sketch-like Output Studies
              </p>
              <p className="font-mono text-[10px] text-[#444]">{artAspect.toUpperCase()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: MINI_ARTWORK_COUNT }).map((_, index) => {
                const variantSeed = deriveIterationSeed(
                  (seed + artIteration * 104_729 + Math.imul(index + 1, 2_654_435_761)) >>> 0
                );
                return (
                  <div key={`art-preview-${index}`} className="space-y-1">
                    <div
                      className="overflow-hidden border border-[#1C1C1E] bg-[#0A0A0B]"
                      style={{ aspectRatio: miniArtworkAspectRatio }}
                    >
                      <canvas
                        ref={(node) => {
                          miniArtworkCanvasRefs.current[index] = node;
                        }}
                        className="h-full w-full"
                      />
                    </div>
                    <p className="font-mono text-[9px] text-[#444]">seed {variantSeed}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-[#444]">
              Sketch-inspired micro pipeline (composition, MT blocks, swirl).
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
