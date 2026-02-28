import { AA_TEXT_TARGET } from "@/lib/constants";

export type MetricTone = "strong" | "balanced" | "weak";

export const METRIC_TONE_CLASS: Record<MetricTone, string> = {
  strong: "text-emerald-300",
  balanced: "text-amber-200",
  weak: "text-rose-300"
};

export const describeHueVariety = (
  hueSpread: number
): { label: string; detail: string; tone: MetricTone } => {
  if (hueSpread < 110) {
    return {
      label: "Focused",
      detail: "Most colors are from nearby families, so the look stays cohesive.",
      tone: "balanced"
    };
  }
  if (hueSpread < 210) {
    return {
      label: "Balanced",
      detail: "Good spread across the wheel without feeling chaotic.",
      tone: "strong"
    };
  }
  return {
    label: "Wide",
    detail: "Very broad color families, strong visual variety.",
    tone: "balanced"
  };
};

export const describeSaturationEnergy = (
  saturationRange: number
): { label: string; detail: string; tone: MetricTone } => {
  if (saturationRange < 24) {
    return {
      label: "Soft",
      detail: "Mostly muted colors, calm and minimal mood.",
      tone: "balanced"
    };
  }
  if (saturationRange < 48) {
    return {
      label: "Mixed",
      detail: "Balanced mix of muted and vivid tones.",
      tone: "strong"
    };
  }
  return {
    label: "Punchy",
    detail: "Strong difference between muted and vivid colors.",
    tone: "strong"
  };
};

export const describeLightnessDepth = (
  lightnessRange: number
): { label: string; detail: string; tone: MetricTone } => {
  if (lightnessRange < 24) {
    return {
      label: "Flat",
      detail: "Colors sit in similar brightness, so depth is limited.",
      tone: "weak"
    };
  }
  if (lightnessRange < 42) {
    return {
      label: "Moderate",
      detail: "Clear light/dark differences with controlled contrast.",
      tone: "balanced"
    };
  }
  return {
    label: "Deep",
    detail: "Strong light vs dark separation, good for hierarchy.",
    tone: "strong"
  };
};

export const describeReadability = (
  averageContrast: number
): { label: string; detail: string; tone: MetricTone } => {
  if (averageContrast < 3) {
    return {
      label: "Challenging",
      detail: "Many pairings are hard to read as text.",
      tone: "weak"
    };
  }
  if (averageContrast < AA_TEXT_TARGET) {
    return {
      label: "Mixed",
      detail: "Some combinations read well, some need caution.",
      tone: "balanced"
    };
  }
  return {
    label: "Strong",
    detail: "Most combinations are solid for text readability.",
    tone: "strong"
  };
};

export const describeAccessibility = (
  aaPassRate: number
): { label: string; detail: string; tone: MetricTone } => {
  if (aaPassRate < 35) {
    return {
      label: "Low Coverage",
      detail: "Only a small set of color pairs are AA-safe for normal text.",
      tone: "weak"
    };
  }
  if (aaPassRate < 70) {
    return {
      label: "Partial Coverage",
      detail: "AA-safe options exist, but pairing choice matters.",
      tone: "balanced"
    };
  }
  return {
    label: "High Coverage",
    detail: "Most pairings can support readable text.",
    tone: "strong"
  };
};
