import type { PaletteColor } from "@/lib/palette";
import { MAX_FAVORITES } from "@/lib/constants";
import { serializePalette } from "@/lib/validators";

type FavoritesDrawerProps = {
  favorites: PaletteColor[][];
  drawerOpen: boolean;
  onClose: () => void;
  onApply: (palette: PaletteColor[]) => void;
  onRemove: (index: number) => void;
  onCopyHex: (hex: string) => void;
};

export function FavoritesDrawer({
  favorites,
  drawerOpen,
  onClose,
  onApply,
  onRemove,
  onCopyHex
}: FavoritesDrawerProps) {
  return (
    <aside
      className={`favorites-drawer fixed inset-y-0 right-0 z-30 w-80 border-l border-[#1C1C1E] bg-[#0A0A0B] p-4 transition-transform duration-250 lg:static lg:translate-x-0 lg:border lg:border-[#1C1C1E] ${
        drawerOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xs uppercase tracking-[0.22em] text-[#888]">
          Favorites ({favorites.length}/{MAX_FAVORITES})
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="btn-ghost px-2 py-1 text-xs lg:hidden"
        >
          Close
        </button>
      </div>

      {favorites.length === 0 ? (
        <p className="border border-dashed border-[#2A2A2A] p-4 text-sm text-[#555]">
          Saved palettes appear here. You can keep up to {MAX_FAVORITES}.
        </p>
      ) : (
        <ul className="space-y-3 overflow-y-auto pr-1">
          {favorites.map((favorite, index) => (
            <li
              key={`${serializePalette(favorite)}-${index}`}
              className="border border-[#1C1C1E] p-3"
            >
              <button
                type="button"
                onClick={() => onApply(favorite)}
                className="mb-3 flex w-full gap-1.5 border border-[#1C1C1E] p-1.5 transition hover:border-[#333]"
                aria-label={`Apply favorite palette ${index + 1}`}
              >
                {favorite.map((color, swatchIndex) => (
                  <span
                    key={`${color.hex}-${swatchIndex}`}
                    className="h-8 flex-1 border border-black/25"
                    style={{ backgroundColor: color.hex }}
                  />
                ))}
              </button>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {favorite.map((color, swatchIndex) => (
                  <button
                    key={`${color.hex}-${index}-${swatchIndex}`}
                    type="button"
                    onClick={() => onCopyHex(color.hex)}
                    className="font-mono text-[11px] tracking-[0.14em] text-[#555] transition hover:text-[#EEE]"
                  >
                    {color.hex}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="ml-auto btn-ghost px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
