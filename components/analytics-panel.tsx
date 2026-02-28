import type { PaletteColor } from "@/lib/palette";
import { METRIC_TONE_CLASS } from "@/lib/analytics";
import type { MetricTone } from "@/lib/analytics";
import { ContrastMatrix } from "@/components/contrast-matrix";

type MetricResult = { label: string; detail: string; tone: MetricTone };

type AnalyticsSummary = {
  hueSpread: number;
  saturationRange: number;
  lightnessRange: number;
  averageContrast: number;
  minContrast: number;
  maxContrast: number;
  minPair: [number, number];
  maxPair: [number, number];
  aaPassRate: number;
  aaPassingPairs: number;
  totalPairs: number;
};

type AnalyticsNarrative = {
  variety: MetricResult;
  energy: MetricResult;
  depth: MetricResult;
  readability: MetricResult;
  accessibility: MetricResult;
  strongestPair: { a: number; b: number; ratio: number };
  weakestPair: { a: number; b: number; ratio: number };
  tip: string;
};

type AnalyticsPanelProps = {
  palette: PaletteColor[];
  contrastMatrix: number[][];
  analyticsSummary: AnalyticsSummary;
  analyticsNarrative: AnalyticsNarrative;
};

export function AnalyticsPanel({
  palette,
  contrastMatrix,
  analyticsSummary,
  analyticsNarrative
}: AnalyticsPanelProps) {
  return (
    <section className="section-panel">
      <div className="section-header mb-4">
        <h2 className="section-label">Palette Analytics</h2>
        <span className="section-sublabel">plain-language palette health check</span>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Color Variety", metric: analyticsNarrative.variety, value: `${analyticsSummary.hueSpread.toFixed(1)}° spread` },
          { label: "Color Energy", metric: analyticsNarrative.energy, value: `${analyticsSummary.saturationRange.toFixed(1)} sat range` },
          { label: "Light/Dark Depth", metric: analyticsNarrative.depth, value: `${analyticsSummary.lightnessRange.toFixed(1)} lightness range` },
          { label: "Text Safety", metric: analyticsNarrative.accessibility, value: `${analyticsSummary.aaPassingPairs}/${analyticsSummary.totalPairs} pairs AA` }
        ].map(({ label, metric, value }) => (
          <div key={label} className="border border-[#1C1C1E] bg-[#0E0E0F] px-3 py-2">
            <p className="font-display text-[10px] uppercase tracking-[0.14em] text-[#555]">{label}</p>
            <p className={`text-sm font-bold ${METRIC_TONE_CLASS[metric.tone]}`}>
              {metric.label}
            </p>
            <p className="font-mono text-[11px] text-[#666]">{value}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#555]">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 border border-[#1C1C1E] px-3 py-3 text-xs text-[#555]">
        <p className="mb-2 font-display text-[10px] uppercase tracking-[0.14em] text-[#888]">
          Quick Guidance
        </p>
        <p>
          Best text combo: Color {analyticsNarrative.strongestPair.a + 1} (
          {palette[analyticsNarrative.strongestPair.a]?.hex}) on Color{" "}
          {analyticsNarrative.strongestPair.b + 1} (
          {palette[analyticsNarrative.strongestPair.b]?.hex}) at{" "}
          {analyticsNarrative.strongestPair.ratio.toFixed(2)}:1.
        </p>
        <p className="mt-1">
          Risky combo: Color {analyticsNarrative.weakestPair.a + 1} (
          {palette[analyticsNarrative.weakestPair.a]?.hex}) on Color{" "}
          {analyticsNarrative.weakestPair.b + 1} (
          {palette[analyticsNarrative.weakestPair.b]?.hex}) at{" "}
          {analyticsNarrative.weakestPair.ratio.toFixed(2)}:1.
        </p>
        <p className="mt-1">
          Readability: {analyticsNarrative.readability.label} (
          {analyticsSummary.averageContrast.toFixed(2)}:1 average). {analyticsNarrative.tip}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
          <p className="mb-2 font-display text-xs uppercase tracking-[0.14em] text-[#666]">
            Color Wheel Map
          </p>
          <svg viewBox="0 0 220 220" className="h-44 w-full">
            <circle
              cx="110"
              cy="110"
              r="74"
              stroke="rgba(148,163,184,0.2)"
              strokeWidth="1.5"
              fill="none"
            />
            {palette.map((color, index) => {
              const angle = ((color.hsl.h - 90) * Math.PI) / 180;
              const x = 110 + Math.cos(angle) * 74;
              const y = 110 + Math.sin(angle) * 74;
              return (
                <g key={`hue-node-${index}`}>
                  <line
                    x1="110"
                    y1="110"
                    x2={x}
                    y2={y}
                    stroke="rgba(148,163,184,0.15)"
                    strokeWidth="1"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="8"
                    fill={color.hex}
                    stroke="rgba(0,0,0,0.6)"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
            <circle cx="110" cy="110" r="4" fill="rgba(148,163,184,0.4)" />
          </svg>
          <p className="mt-2 text-[10px] text-[#555]">
            Dots close together = similar color families.
          </p>
        </article>

        <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
          <p className="mb-2 font-display text-xs uppercase tracking-[0.14em] text-[#666]">
            Tone Balance Map
          </p>
          <div
            className="relative h-44 overflow-hidden border border-[#1C1C1E]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "20% 20%"
            }}
          >
            {palette.map((color, index) => (
              <span
                key={`sl-point-${index}`}
                className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/80 shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                style={{
                  left: `${color.hsl.s}%`,
                  top: `${100 - color.hsl.l}%`,
                  backgroundColor: color.hex
                }}
                aria-label={`Color ${index + 1} S:${Math.round(color.hsl.s)} L:${Math.round(color.hsl.l)}`}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-display text-[10px] uppercase tracking-[0.12em] text-[#555]">
            <span>Muted</span>
            <span>Vivid</span>
          </div>
          <p className="mt-1 text-[10px] text-[#555]">Top = lighter, bottom = darker.</p>
        </article>

        <ContrastMatrix palette={palette} contrastMatrix={contrastMatrix} />
      </div>
    </section>
  );
}
