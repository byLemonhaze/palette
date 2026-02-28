import type { PaletteColor } from "@/lib/palette";
import { getContrastHeat } from "@/lib/contrast";
import { AA_TEXT_TARGET } from "@/lib/constants";

type ContrastMatrixProps = {
  palette: PaletteColor[];
  contrastMatrix: number[][];
};

export function ContrastMatrix({ palette, contrastMatrix }: ContrastMatrixProps) {
  return (
    <article className="border border-[#1C1C1E] bg-[#0E0E0F] p-3">
      <p className="mb-2 font-display text-xs uppercase tracking-[0.14em] text-[#666]">
        Text Readability Grid
      </p>
      <div className="overflow-hidden border border-[#1C1C1E]">
        <table className="w-full border-separate border-spacing-1 text-[10px]">
          <thead>
            <tr className="text-[#555]">
              <th className="px-1 py-1 text-left font-normal">#</th>
              {palette.map((_, index) => (
                <th key={`contrast-col-${index}`} className="px-1 py-1 text-left font-normal">
                  {index + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contrastMatrix.map((ratios, rowIndex) => (
              <tr key={`contrast-row-${rowIndex}`}>
                <th className="px-1 py-1 text-left font-normal text-[#555]">{rowIndex + 1}</th>
                {ratios.map((ratio, columnIndex) => (
                  <td
                    key={`contrast-cell-${rowIndex}-${columnIndex}`}
                    className="px-1 py-1 text-center font-mono"
                    style={{
                      backgroundColor: getContrastHeat(ratio),
                      color: ratio >= 4.5 ? "#f8fafc" : "#111827"
                    }}
                  >
                    {ratio.toFixed(2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-display text-[10px] uppercase tracking-[0.12em] text-[#555]">
        Values {AA_TEXT_TARGET}+ are AA-safe for normal text
      </p>
    </article>
  );
}
