import type { PaletteTheme } from "@/lib/palette";
import { SWATCH_COUNT } from "@/lib/constants";
import { normalizeHex } from "@/lib/validators";

type CustomThemeEditorProps = {
  customThemes: PaletteTheme[];
  customThemeName: string;
  customThemeColors: string[];
  customThemeMessage: string | null;
  onNameChange: (value: string) => void;
  onColorChange: (index: number, value: string) => void;
  onColorBlur: (index: number, value: string) => void;
  onUseCurrent: () => void;
  onSave: () => void;
  onApplyTheme: (id: string) => void;
  onRemoveTheme: (id: string) => void;
};

export function CustomThemeEditor({
  customThemes,
  customThemeName,
  customThemeColors,
  customThemeMessage,
  onNameChange,
  onColorChange,
  onColorBlur,
  onUseCurrent,
  onSave,
  onApplyTheme,
  onRemoveTheme
}: CustomThemeEditorProps) {
  return (
    <section className="section-panel">
      <div className="section-header">
        <h2 className="section-label">Custom Palette Forge</h2>
        <span className="section-sublabel">create and save your own themes</span>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={customThemeName}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Name your palette"
            className="input-field text-sm"
          />
          <button type="button" onClick={onUseCurrent} className="btn-ghost text-xs">
            Use Current
          </button>
          <button type="button" onClick={onSave} className="btn-ghost text-xs">
            Save Custom
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          {customThemeColors.map((value, index) => (
            <label key={`custom-color-${index}`} className="border border-[#1C1C1E] bg-[#0E0E0F] p-2">
              <span className="mb-1 block font-display text-[10px] uppercase tracking-[0.12em] text-[#555]">
                Color {index + 1}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={normalizeHex(value) ?? "#000000"}
                  onChange={(event) => onColorChange(index, event.target.value)}
                  className="h-9 w-10 border border-[#2A2A2A] bg-transparent"
                  aria-label={`Choose custom color ${index + 1}`}
                />
                <input
                  type="text"
                  value={value}
                  onChange={(event) => onColorChange(index, event.target.value)}
                  onBlur={(event) => onColorBlur(index, event.target.value)}
                  className="input-field font-mono text-[11px]"
                  aria-label={`Custom hex color ${index + 1}`}
                />
              </div>
            </label>
          ))}
        </div>

        <p className="text-xs text-[#555]">
          {customThemeMessage ?? "Save a custom palette, then pick it from theme selector."}
        </p>

        {customThemes.length === 0 ? (
          <p className="border border-dashed border-[#2A2A2A] p-3 text-xs text-[#555]">
            No custom palettes yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {customThemes.map((theme) => (
              <li
                key={theme.id}
                className="flex flex-wrap items-center gap-2 border border-[#1C1C1E] bg-[#0E0E0F] p-2"
              >
                <div className="mr-1 flex h-8 w-36 overflow-hidden border border-black/25">
                  {theme.colors.slice(0, SWATCH_COUNT).map((color, index) => (
                    <span
                      key={`${theme.id}-${index}`}
                      className="h-full flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="font-display text-xs uppercase tracking-[0.12em] text-[#CCC]">
                  {theme.name}
                </p>
                <button
                  type="button"
                  onClick={() => onApplyTheme(theme.id)}
                  className="ml-auto btn-ghost px-2 py-1 text-xs"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveTheme(theme.id)}
                  className="btn-ghost px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
