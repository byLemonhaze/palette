import type { PaletteColor } from "@/lib/palette";
import { serializePalette } from "@/lib/validators";
import { ChevronDownIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";

type VariantPalette = {
  seed: number;
  themeId: string;
  themeName: string;
  colors: PaletteColor[];
};

type VariantLabProps = {
  variantPalettes: VariantPalette[];
  variantLabOpen: boolean;
  currentPaletteKey: string;
  onToggle: () => void;
  onApply: (variant: VariantPalette) => void;
};

export function VariantLab({
  variantPalettes,
  variantLabOpen,
  currentPaletteKey,
  onToggle,
  onApply
}: VariantLabProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="section-label">Variant Lab</p>
          <p className="section-sublabel">same locks, nearby deterministic seeds</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 btn-ghost px-2.5 py-1 text-xs"
          aria-expanded={variantLabOpen}
        >
          {variantLabOpen ? "Collapse" : "Expand"}
          <ChevronDownIcon rotated={variantLabOpen} />
        </button>
      </div>
      <AnimatePresence>
        {variantLabOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4 pt-1">
              {variantPalettes.map((variant, index) => {
                const variantKey = serializePalette(variant.colors);
                const isCurrent = variantKey === currentPaletteKey;
                return (
                  <motion.button
                    key={`${variant.seed}-${index}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: index * 0.025 }}
                    type="button"
                    onClick={() => onApply(variant)}
                    className={`border p-2 text-left transition ${
                      isCurrent
                        ? "border-[#444] bg-[#1A1A1A]"
                        : "border-[#1C1C1E] bg-[#0E0E0F] hover:border-[#333]"
                    }`}
                    aria-label={`Apply variant ${index + 1}`}
                  >
                    <span className="mb-2 flex h-6 overflow-hidden border border-black/25">
                      {variant.colors.map((color, swatchIndex) => (
                        <span
                          key={`${color.hex}-${swatchIndex}`}
                          className="h-full flex-1"
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </span>
                    <span className="block font-display text-[10px] uppercase tracking-[0.14em] text-[#555]">
                      V{index + 1}
                    </span>
                    <span className="font-mono text-[10px] text-[#444]">
                      {variant.seed}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <p className="border border-[#1C1C1E] px-3 py-2 text-xs text-[#555]">
            Expand to browse deterministic nearby seeds.
          </p>
        )}
      </AnimatePresence>
    </section>
  );
}
