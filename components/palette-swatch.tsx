import type { PaletteColor } from "@/lib/palette";
import { getReadableTextColor } from "@/lib/contrast";
import { LockClosedIcon, LockOpenIcon, CheckIcon } from "@/components/ui/icons";

type PaletteSwatchProps = {
  color: PaletteColor;
  index: number;
  toneName: string;
  isLocked: boolean;
  isCopied: boolean;
  onCopy: (hex: string) => void;
  onLock: (index: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

export function PaletteSwatch({
  color,
  index,
  toneName,
  isLocked,
  isCopied,
  onCopy,
  onLock,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown
}: PaletteSwatchProps) {
  const onColor = getReadableTextColor(color.hex);

  return (
    <article className="swatch-card border border-[#1C1C1E] bg-[#0E0E0F]">
      <div
        className="swatch-fill relative overflow-hidden"
        style={{ backgroundColor: color.hex }}
      >
        <span
          className="absolute left-2 top-2 font-mono text-[10px] tracking-[0.12em] opacity-70"
          style={{ color: onColor }}
        >
          {index + 1}
        </span>
        <button
          type="button"
          onClick={() => onLock(index)}
          className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center"
          style={{
            color: onColor,
            background: "rgba(0,0,0,0.28)",
            border: "1px solid rgba(255,255,255,0.18)"
          }}
          aria-label={isLocked ? `Unlock ${color.hex}` : `Lock ${color.hex}`}
        >
          {isLocked ? <LockClosedIcon /> : <LockOpenIcon />}
        </button>
        <p
          className="absolute bottom-2 left-2 font-mono text-[11px] tracking-[0.12em]"
          style={{ color: onColor }}
        >
          {color.hex}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2 px-0.5">
        <p className="min-w-0 flex-1 truncate text-[11px] text-[#666]">{toneName}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-[10px] text-[#555] transition hover:text-[#CCC] disabled:opacity-25"
            aria-label={`Move color ${index + 1} up`}
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-[10px] text-[#555] transition hover:text-[#CCC] disabled:opacity-25"
            aria-label={`Move color ${index + 1} down`}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onCopy(color.hex)}
            className="inline-flex items-center gap-1 border border-[#2A2A2A] px-2 py-1 font-mono text-[11px] text-[#AAA] transition hover:border-[#444] hover:text-[#EEE]"
            aria-label={`Copy ${color.hex}`}
          >
            {isCopied ? <CheckIcon /> : null}
            {isCopied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </article>
  );
}
