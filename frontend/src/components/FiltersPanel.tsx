"use client";

import { useState, useCallback } from "react";
import type { FilterState, ThresholdState } from "@/types/token";
import { defaultFilters, defaultThresholds } from "@/types/token";

interface FiltersPanelProps {
  filterState: FilterState;
  thresholdState: ThresholdState;
  visibleCount: number;
  onFiltersChange: (f: FilterState) => void;
  onThresholdsChange: (t: ThresholdState) => void;
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildPresetsUsd(): { value: number; label: string }[] {
  const opts: { value: number; label: string }[] = [{ value: 0, label: "—" }];
  for (const v of [10_000, 20_000, 30_000, 40_000]) {
    opts.push({ value: v, label: `${v / 1_000} K$` });
  }
  for (let v = 50_000; v <= 1_000_000; v += 50_000) {
    opts.push({
      value: v,
      label: v >= 1_000_000 ? `${v / 1_000_000} M$` : `${v / 1_000} K$`,
    });
  }
  for (let v = 1_500_000; v <= 10_000_000; v += 500_000) {
    opts.push({ value: v, label: `${v / 1_000_000} M$` });
  }
  for (const v of [25_000_000, 50_000_000, 100_000_000]) {
    opts.push({ value: v, label: `${v / 1_000_000} M$` });
  }
  return opts;
}

const PRESETS_USD = buildPresetsUsd();

const PRESETS_PERCENT = [
  { value: -50, label: "-50 %" },
  { value: -25, label: "-25 %" },
  { value: 0, label: "0 %" },
  { value: 25, label: "25 %" },
  { value: 50, label: "50 %" },
  { value: 100, label: "100 %" },
  { value: 200, label: "200 %" },
  { value: 500, label: "500 %" },
];

function InputWithPresets({
  value,
  onChange,
  options,
  placeholder = "—",
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="flex gap-1 w-full max-w-[200px]">
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(parseNum(e.target.value))}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2.5 py-2 bg-input-bg border border-input-border rounded-[var(--radius-sm)] text-text text-sm focus:outline-none focus:border-focus-ring transition-colors"
      />
      <select
        value=""
        onChange={(e) => {
          const v = e.target.value;
          if (v !== "") onChange(parseNum(v));
          e.target.value = "";
        }}
        className="shrink-0 w-11 py-2 pl-1.5 pr-6 bg-input-bg border border-input-border rounded-[var(--radius-sm)] text-text text-sm focus:outline-none focus:border-focus-ring cursor-pointer appearance-none bg-[right_0.35rem_center] bg-no-repeat bg-[length:0.6rem] transition-colors"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
        }}
        title="Choisir un palier"
      >
        <option value="">▼</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FiltersPanel({
  filterState,
  thresholdState,
  visibleCount,
  onFiltersChange,
  onThresholdsChange,
}: FiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showThresholds, setShowThresholds] = useState(false);

  const updateFilter = useCallback(
    (key: keyof FilterState, value: number | boolean) => {
      onFiltersChange({ ...filterState, [key]: value });
    },
    [filterState, onFiltersChange]
  );

  const updateThreshold = useCallback(
    (key: keyof ThresholdState, value: number) => {
      onThresholdsChange({ ...thresholdState, [key]: value });
    },
    [thresholdState, onThresholdsChange]
  );

  const resetFilters = useCallback(() => {
    onFiltersChange(defaultFilters);
  }, [onFiltersChange]);

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-surface-elevated overflow-hidden"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-surface-elevated hover:bg-surface-hover text-left transition-colors">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsOpen((v) => !v)}
          onKeyDown={(e) =>
            e.key === "Enter" || e.key === " " ? setIsOpen((v) => !v) : null
          }
          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
        >
          <span
            className="text-text-muted text-sm transition-transform shrink-0"
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            ▼
          </span>
          <h3 className="text-base font-semibold tracking-tight text-text">
            Filters
          </h3>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-text-muted">
            {visibleCount} tokens
          </span>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3.5 py-2 bg-transparent border-2 border-border text-text text-sm font-medium rounded-[var(--radius-md)] cursor-pointer transition-all duration-150 hover:bg-surface-hover hover:border-focus-ring hover:scale-[1.02] active:bg-surface-muted active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-elevated"
          >
            Reset
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 pt-4">
          <div className="mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-dim block mb-2.5">
              Quick
            </span>
            <div className="flex flex-wrap gap-6 items-center">
              <label className="inline-flex items-center gap-2 cursor-pointer text-text text-sm">
                <input
                  type="checkbox"
                  checked={filterState.filter24h}
                  onChange={(e) => updateFilter("filter24h", e.target.checked)}
                  className="w-4 h-4 rounded border-border-muted"
                />
                Tokens &gt; 24h
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer text-text text-sm">
                <input
                  type="checkbox"
                  checked={filterState.filterSuspicious}
                  onChange={(e) =>
                    updateFilter("filterSuspicious", e.target.checked)
                  }
                  className="w-4 h-4 rounded border-border-muted"
                />
                Hide suspicious
              </label>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-dim block mb-2">
              Minimums
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 gap-y-3">
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Liquidity ($)</span>
                <InputWithPresets
                  value={filterState.minLiquidity ?? 0}
                  onChange={(v) => updateFilter("minLiquidity", v)}
                  options={PRESETS_USD}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Volume ($)</span>
                <InputWithPresets
                  value={filterState.minVolume ?? 0}
                  onChange={(v) => updateFilter("minVolume", v)}
                  options={PRESETS_USD}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Market Cap ($)</span>
                <InputWithPresets
                  value={filterState.mcapMin ?? 0}
                  onChange={(v) => updateFilter("mcapMin", v)}
                  options={PRESETS_USD}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Price change %</span>
                <InputWithPresets
                  value={filterState.minPriceChange ?? 0}
                  onChange={(v) => updateFilter("minPriceChange", v)}
                  options={PRESETS_PERCENT}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Volume change %</span>
                <InputWithPresets
                  value={filterState.minVolumeChange ?? 0}
                  onChange={(v) => updateFilter("minVolumeChange", v)}
                  options={PRESETS_PERCENT}
                />
              </label>
            </div>
          </div>

          <div className="mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-dim block mb-2.5">
              Maximums
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 gap-y-3">
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Market Cap ($)</span>
                <InputWithPresets
                  value={filterState.mcapMax ?? 0}
                  onChange={(v) => updateFilter("mcapMax", v)}
                  options={PRESETS_USD}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Price change %</span>
                <InputWithPresets
                  value={filterState.maxPriceChange ?? 0}
                  onChange={(v) => updateFilter("maxPriceChange", v)}
                  options={PRESETS_PERCENT}
                />
              </label>
              <label className="flex flex-col gap-1 text-text-muted text-sm">
                <span>Volume change %</span>
                <InputWithPresets
                  value={filterState.maxVolumeChange ?? 0}
                  onChange={(v) => updateFilter("maxVolumeChange", v)}
                  options={PRESETS_PERCENT}
                />
              </label>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowThresholds((v) => !v)}
              className="w-full px-3.5 py-2.5 bg-input-bg border border-input-border text-text rounded-[var(--radius-md)] text-left text-sm font-medium hover:bg-surface-hover cursor-pointer transition-colors"
            >
              Detection thresholds (suspicious highlight){" "}
              {showThresholds ? "▲" : "▼"}
            </button>
            {showThresholds && (
              <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4">
                {(
                  [
                    ["volumeChangeMin", "volumeChangeMax", "Volume change %"],
                    ["priceChangeMin", "priceChangeMax", "Price change %"],
                    ["volLiqThreshold", null, "Vol/Liq >"],
                    ["volMcThreshold", null, "Vol/MC >"],
                    ["liqMcThreshold", null, "Liq/MC <"],
                  ] as const
                ).map(([keyA, keyB, label]) => (
                  <label
                    key={String(keyA)}
                    className="flex flex-1 min-w-[140px] flex-col gap-1 text-text-muted text-sm"
                  >
                    <span>{label}</span>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={thresholdState[keyA]}
                        onChange={(e) =>
                          updateThreshold(keyA, parseNum(e.target.value))
                        }
                        step={
                          keyA.includes("Liq") || keyA.includes("Mc") ? 0.01 : 1
                        }
                        className="max-w-[70px] px-2.5 py-2 bg-input-bg border border-input-border rounded-[var(--radius-sm)] text-text text-sm focus:outline-none focus:border-focus-ring transition-colors"
                      />
                      {keyB && (
                        <input
                          type="number"
                          value={thresholdState[keyB]}
                          onChange={(e) =>
                            updateThreshold(keyB, parseNum(e.target.value))
                          }
                          className="max-w-[70px] px-2.5 py-2 bg-input-bg border border-input-border rounded-[var(--radius-sm)] text-text text-sm focus:outline-none focus:border-focus-ring transition-colors"
                        />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
