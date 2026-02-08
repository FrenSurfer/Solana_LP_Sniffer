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
  onApply: () => void;
}

function parseNum(v: string): number {
  const n = parseFloat(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function FiltersPanel({
  filterState,
  thresholdState,
  visibleCount,
  onFiltersChange,
  onThresholdsChange,
  onApply,
}: FiltersPanelProps) {
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
    onApply();
  }, [onFiltersChange, onApply]);

  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-800 p-5 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-600 mb-4">
        <h3 className="text-base font-semibold text-zinc-200">Filters</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-400">
            {visibleCount} tokens
          </span>
          <button
            type="button"
            onClick={onApply}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-md"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-md"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 block mb-2">
          Quick
        </span>
        <div className="flex flex-wrap gap-6 items-center">
          <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-200 text-sm">
            <input
              type="checkbox"
              checked={filterState.filter24h}
              onChange={(e) => updateFilter("filter24h", e.target.checked)}
              className="w-4 h-4 rounded border-zinc-500"
            />
            Tokens &gt; 24h
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer text-zinc-200 text-sm">
            <input
              type="checkbox"
              checked={filterState.filterSuspicious}
              onChange={(e) => updateFilter("filterSuspicious", e.target.checked)}
              className="w-4 h-4 rounded border-zinc-500"
            />
            Hide suspicious
          </label>
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 block mb-2">
          Minimums
        </span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 gap-y-3">
          {[
            ["minLiquidity", "Liquidity ($)"],
            ["minVolume", "Volume ($)"],
            ["mcapMin", "Market Cap ($)"],
            ["minHolders", "Holders"],
            ["minWallets24h", "Wallets 24h"],
            ["minPriceChange", "Price change %"],
            ["minVolumeChange", "Volume change %"],
          ] as const.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-zinc-400 text-sm">
              <span>{label}</span>
              <input
                type="number"
                value={filterState[key] || ""}
                onChange={(e) => updateFilter(key, parseNum(e.target.value))}
                placeholder="—"
                className="max-w-[120px] px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 block mb-2">
          Maximums
        </span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 gap-y-3">
          {[
            ["mcapMax", "Market Cap ($)"],
            ["maxPriceChange", "Price change %"],
            ["maxVolumeChange", "Volume change %"],
          ] as const.map(([key, label]) => (
            <label key={key} className="flex flex-col gap-1 text-zinc-400 text-sm">
              <span>{label}</span>
              <input
                type="number"
                value={filterState[key as keyof FilterState] ?? ""}
                onChange={(e) =>
                  updateFilter(key as keyof FilterState, parseNum(e.target.value))
                }
                placeholder="—"
                className="max-w-[120px] px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowThresholds((v) => !v)}
          className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 text-zinc-200 rounded text-left text-sm hover:bg-zinc-600"
        >
          Detection thresholds (suspicious highlight) {showThresholds ? "▲" : "▼"}
        </button>
        {showThresholds && (
          <div className="mt-2 pt-3 border-t border-zinc-600 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 gap-y-3">
            {[
              ["volumeChangeMin", "volumeChangeMax", "Volume change %"],
              ["priceChangeMin", "priceChangeMax", "Price change %"],
              ["volLiqThreshold", null, "Vol/Liq >"],
              ["volMcThreshold", null, "Vol/MC >"],
              ["liqMcThreshold", null, "Liq/MC <"],
              ["wallets24hThreshold", null, "Wallets 24h <"],
              ["holdersThreshold", null, "Holders <"],
            ] as const.map(([keyA, keyB, label]) => (
              <label key={String(keyA)} className="flex flex-col gap-1 text-zinc-400 text-sm">
                <span>{label}</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={thresholdState[keyA]}
                    onChange={(e) =>
                      updateThreshold(keyA, parseNum(e.target.value))
                    }
                    step={keyA.includes("Liq") || keyA.includes("Mc") ? 0.01 : 1}
                    className="max-w-[70px] px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
                  />
                  {keyB && (
                    <input
                      type="number"
                      value={thresholdState[keyB]}
                      onChange={(e) =>
                        updateThreshold(keyB, parseNum(e.target.value))
                      }
                      className="max-w-[70px] px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-zinc-200 text-sm focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
