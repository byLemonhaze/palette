import { MASTER_SEED_PREFIX } from "@/lib/constants";

type MasterSeedPanelProps = {
  currentMasterSeed: string;
  masterSeedInput: string;
  seedMessage: string | null;
  onMasterSeedInputChange: (value: string) => void;
  onCopy: () => void;
  onApply: () => void;
};

export function MasterSeedPanel({
  currentMasterSeed,
  masterSeedInput,
  seedMessage,
  onMasterSeedInputChange,
  onCopy,
  onApply
}: MasterSeedPanelProps) {
  return (
    <section className="section-panel">
      <div className="section-header">
        <h2 className="section-label">Master Seed</h2>
        <span className="section-sublabel">deterministic snapshot</span>
      </div>
      <div className="space-y-2.5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={currentMasterSeed}
            readOnly
            className="input-field font-mono text-[11px]"
            aria-label="Current master seed"
          />
          <button type="button" onClick={onCopy} className="btn-ghost text-xs">
            Copy
          </button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={masterSeedInput}
            onChange={(event) => onMasterSeedInputChange(event.target.value)}
            placeholder={`Paste ${MASTER_SEED_PREFIX}.… and load`}
            className="input-field font-mono text-[11px] placeholder:text-[#444]"
            aria-label="Paste master seed"
          />
          <button type="button" onClick={onApply} className="btn-ghost text-xs">
            Load
          </button>
        </div>
        <p className="text-xs text-[#555]">
          {seedMessage ?? "Copy and share exact palette state, or load one to restore it."}
        </p>
      </div>
    </section>
  );
}
