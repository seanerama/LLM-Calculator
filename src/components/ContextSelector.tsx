'use client';

interface ContextSelectorProps {
  selected: number;
  onSelect: (context: number) => void;
  maxContext: number;
}

const PRESETS = [
  { label: '2K', value: 2048 },
  { label: '4K', value: 4096 },
  { label: '8K', value: 8192 },
  { label: '16K', value: 16384 },
  { label: '32K', value: 32768 },
  { label: '64K', value: 65536 },
  { label: '128K', value: 131072 },
];

export function ContextSelector({ selected, onSelect, maxContext }: ContextSelectorProps) {
  const exceedsMax = selected > maxContext;

  return (
    <div className="bg-bg-secondary border border-border-default rounded-xl p-6">
      <h2 className="text-[1.125rem] font-semibold text-text-primary mb-1">Context Length</h2>
      <p className="text-text-muted text-[0.8125rem] mb-3">Choose context window size</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {PRESETS.map(({ label, value }) => {
          const isActive = selected === value;
          const overMax = value > maxContext;
          return (
            <button
              key={value}
              onClick={() => onSelect(value)}
              disabled={false}
              className={`px-3 py-1.5 rounded-lg text-[0.8125rem] font-medium transition-colors border ${
                isActive
                  ? overMax
                    ? 'bg-status-error/20 text-status-error border-status-error/30'
                    : 'bg-accent-primary text-white border-accent-primary'
                  : overMax
                    ? 'text-text-muted border-border-default opacity-50 hover:bg-bg-tertiary'
                    : 'text-text-secondary border-border-default hover:bg-bg-tertiary'
              }`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div>
        <label className="block text-text-secondary text-[0.8125rem] mb-1">Custom (tokens)</label>
        <input
          type="number"
          value={selected}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            onSelect(Math.max(0, val));
          }}
          min={0}
          className={`w-full h-10 px-3 bg-bg-tertiary border rounded-lg text-text-primary font-mono text-[0.8125rem] focus:outline-none focus:ring-3 transition-colors ${
            exceedsMax
              ? 'border-status-error focus:border-status-error focus:ring-status-error/20'
              : 'border-border-default focus:border-border-focus focus:ring-border-focus/20'
          }`}
          aria-label="Custom context length"
        />
        {exceedsMax && (
          <p className="mt-1 text-status-error text-[0.75rem]">
            Exceeds model maximum of {maxContext.toLocaleString()} tokens
          </p>
        )}
      </div>
    </div>
  );
}
