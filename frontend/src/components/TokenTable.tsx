"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { Token } from "@/types/token";
import type {
  FilterState,
  ThresholdState,
  PriceChangeTimeframe,
  ExplorerType,
} from "@/types/token";
import { getExplorerTokenUrl } from "@/types/token";
import { formatNumber, formatPercent, formatRatio } from "@/lib/format";

const BUBBLEMAPS_BASE = "https://app.bubblemaps.io/sol/token/";

export type SortKey =
  | "symbol"
  | "name"
  | "liquidity"
  | "volume"
  | "mc"
  | "price_change_m5"
  | "price_change_h1"
  | "price_change_h6"
  | "price_change_24h"
  | "v24hChangePercent"
  | "volume_liquidity_ratio"
  | "volume_mc_ratio"
  | "liquidity_mc_ratio"
  | "is_pump";

function isSuspicious(
  token: Token,
  th: ThresholdState
): { volCh: boolean; volLiq: boolean; volMc: boolean; liqMc: boolean } {
  const volCh =
    token.v24hChangePercent < th.volumeChangeMin ||
    token.v24hChangePercent > th.volumeChangeMax;
  return {
    volCh,
    volLiq: token.volume_liquidity_ratio > th.volLiqThreshold,
    volMc: token.volume_mc_ratio > th.volMcThreshold,
    liqMc: token.liquidity_mc_ratio < th.liqMcThreshold,
  };
}

function getPriceChangeForTimeframe(
  token: Token,
  tf: PriceChangeTimeframe
): number {
  if (tf === "24h") return token.price_change_24h;
  if (tf === "m5") return token.price_change_m5;
  if (tf === "h1") return token.price_change_h1;
  if (tf === "h6") return token.price_change_h6;
  return token.price_change_24h;
}

function filterToken(
  token: Token,
  filters: FilterState,
  priceChangeValue: number,
  suspicious: {
    volCh: boolean;
    volLiq: boolean;
    volMc: boolean;
    liqMc: boolean;
  }
): boolean {
  if (filters.filter24h && token.v24hChangePercent === 0) return false;
  if (filters.minLiquidity && token.liquidity < filters.minLiquidity)
    return false;
  if (filters.minVolume && token.volume < filters.minVolume) return false;
  if (filters.mcapMin && token.mc < filters.mcapMin) return false;
  if (filters.mcapMax && token.mc > filters.mcapMax) return false;
  const anySuspicious =
    suspicious.volCh ||
    suspicious.volLiq ||
    suspicious.volMc ||
    suspicious.liqMc;
  if (filters.filterSuspicious && anySuspicious) return false;
  if (
    filters.minVolumeChange &&
    token.v24hChangePercent < filters.minVolumeChange
  )
    return false;
  if (
    filters.maxVolumeChange &&
    token.v24hChangePercent > filters.maxVolumeChange
  )
    return false;
  if (filters.minPriceChange && priceChangeValue < filters.minPriceChange)
    return false;
  if (filters.maxPriceChange && priceChangeValue > filters.maxPriceChange)
    return false;
  return true;
}

const PRICE_TF_SORT_KEY: Record<PriceChangeTimeframe, SortKey> = {
  m5: "price_change_m5",
  h1: "price_change_h1",
  h6: "price_change_h6",
  "24h": "price_change_24h",
};

const PRICE_TF_LABEL: Record<PriceChangeTimeframe, string> = {
  m5: "5m",
  h1: "1h",
  h6: "6h",
  "24h": "24h",
};

export interface TokenTableProps {
  tokens: Token[];
  filterState: FilterState;
  thresholdState: ThresholdState;
  searchQuery: string;
  selectedAddresses: Set<string>;
  onToggleSelect: (address: string) => void;
  onSelectAll: (checked: boolean, visibleAddresses: string[]) => void;
  onClearSelection?: () => void;
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
  priceChangeTimeframe: PriceChangeTimeframe;
  onPriceChangeTimeframeChange: (tf: PriceChangeTimeframe) => void;
  onVisibleCountChange?: (n: number) => void;
  explorer: ExplorerType;
}

export function TokenTable({
  tokens,
  filterState,
  thresholdState,
  searchQuery,
  selectedAddresses,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  sortBy,
  sortOrder,
  onSort,
  priceChangeTimeframe,
  onPriceChangeTimeframeChange,
  onVisibleCountChange,
  explorer,
}: TokenTableProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const filtered = useCallback(() => {
    const q = searchQuery.toLowerCase();
    return tokens.filter((token) => {
      const suspicious = isSuspicious(token, thresholdState);
      const priceChangeValue = getPriceChangeForTimeframe(
        token,
        priceChangeTimeframe
      );
      if (!filterToken(token, filterState, priceChangeValue, suspicious))
        return false;
      if (
        q &&
        !token.symbol.toLowerCase().includes(q) &&
        !token.name.toLowerCase().includes(q) &&
        !token.address.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [
    tokens,
    filterState,
    thresholdState,
    searchQuery,
    priceChangeTimeframe,
  ])();

  useEffect(() => {
    onVisibleCountChange?.(filtered.length);
  }, [filtered.length, onVisibleCountChange]);

  const sorted = [...filtered].sort((a, b) => {
    const key = sortBy;
    const getVal = (t: Token): number | string =>
      key === "is_pump"
        ? t.is_pump
          ? 1
          : 0
        : (t as unknown as Record<string, number | string>)[key] ?? 0;
    const aVal = getVal(a);
    const bVal = getVal(b);
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    }
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortOrder === "asc" ? cmp : -cmp;
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 500);
  };

  const visibleAddresses = sorted.map((t) => t.address);
  const allSelected =
    sorted.length > 0 && sorted.every((t) => selectedAddresses.has(t.address));
  const someSelected = sorted.some((t) => selectedAddresses.has(t.address));

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const SortHeader = ({
    col,
    label,
    tooltip,
  }: {
    col: SortKey;
    label: string;
    tooltip?: string;
  }) => (
    <th className="sticky top-0 z-10 px-3 py-3.5 bg-surface-hover border-b border-border text-right font-semibold text-text min-w-[80px]">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center justify-end gap-1 w-full text-right hover:text-link cursor-pointer"
        title={tooltip}
      >
        {label}
        <span className="opacity-50 text-xs">
          {sortBy === col ? (sortOrder === "asc" ? "▲" : "▼") : "▼"}
        </span>
      </button>
    </th>
  );

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-border bg-surface-elevated"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <table className="w-full min-w-[1100px] border-collapse text-sm text-right bg-surface-elevated table-fixed">
        <colgroup>
          <col className="w-10 min-w-10" />
          <col className="w-[7%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[9%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[6%]" />
          <col className="w-[6%]" />
          <col className="w-[6%] min-w-[4rem]" />
          <col className="w-10" />
          <col className="w-16" />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky top-0 z-10 px-0 py-3.5 bg-surface-hover border-b border-border w-10 shrink-0 min-w-10 relative text-center">
              <span className="flex justify-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    onSelectAll(e.target.checked, visibleAddresses)
                  }
                  className="w-4 h-4 cursor-pointer shrink-0"
                />
              </span>
              {onClearSelection && selectedAddresses.size > 0 && (
                <button
                  type="button"
                  onClick={onClearSelection}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-negative hover:bg-negative/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer text-sm leading-none"
                  title="Clear selection"
                  aria-label="Clear selection"
                >
                  ×
                </button>
              )}
            </th>
            <SortHeader col="symbol" label="Symbol" />
            <SortHeader col="name" label="Name" />
            <SortHeader col="liquidity" label="Liq. ($)" />
            <SortHeader col="volume" label="Vol. 24h ($)" />
            <SortHeader col="mc" label="MCap ($)" />
            <th className="sticky top-0 z-10 px-2 py-3.5 bg-surface-hover border-b border-border text-right font-semibold text-text min-w-[80px]">
              <div className="flex items-center justify-end gap-1 flex-wrap">
                <span className="text-xs text-text shrink-0">Δ Prix</span>
                <select
                  value={priceChangeTimeframe}
                  onChange={(e) =>
                    onPriceChangeTimeframeChange(
                      e.target.value as PriceChangeTimeframe
                    )
                  }
                  className="px-2 py-1 bg-input-bg border border-input-border rounded-[var(--radius-sm)] text-text text-xs focus:outline-none focus:border-focus-ring cursor-pointer"
                  title="Timeframe (DexScreener)"
                >
                  {(["m5", "h1", "h6", "24h"] as const).map((tf) => (
                    <option key={tf} value={tf}>
                      {PRICE_TF_LABEL[tf]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onSort(PRICE_TF_SORT_KEY[priceChangeTimeframe])
                  }
                  className="flex items-center justify-end gap-0.5 hover:text-link cursor-pointer"
                  title="Sort by price change"
                >
                  <span className="opacity-50 text-xs">
                    {sortBy === PRICE_TF_SORT_KEY[priceChangeTimeframe]
                      ? sortOrder === "asc"
                        ? "▲"
                        : "▼"
                      : "▼"}
                  </span>
                </button>
              </div>
            </th>
            <SortHeader
              col="v24hChangePercent"
              label="Δ Volume (%)"
              tooltip="24h volume change"
            />
            <SortHeader
              col="volume_liquidity_ratio"
              label="Vol/Liq"
              tooltip="Volume 24h / Liquidity"
            />
            <SortHeader
              col="volume_mc_ratio"
              label="Vol/MC"
              tooltip="Volume 24h / Market Cap"
            />
            <SortHeader
              col="liquidity_mc_ratio"
              label="Liq/MC"
              tooltip="Liquidity / Market Cap"
            />
            <th className="sticky top-0 z-10 px-2 py-3.5 bg-surface-hover border-b border-border text-center font-semibold text-text w-10 shrink-0 min-w-10">
              <button
                type="button"
                onClick={() => onSort("is_pump")}
                className="flex items-center justify-center gap-1 w-full text-center hover:text-link cursor-pointer"
                title="Address ends with 'pump'"
              >
                Pump
                <span className="opacity-50 text-xs">
                  {sortBy === "is_pump"
                    ? sortOrder === "asc"
                      ? "▲"
                      : "▼"
                    : "▼"}
                </span>
              </button>
            </th>
            <th className="sticky top-0 z-10 px-2 py-3.5 bg-surface-hover border-b border-border text-center font-semibold text-text w-16 shrink-0">
              Bubblemaps
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((token) => {
            const sus = isSuspicious(token, thresholdState);
            return (
              <tr
                key={token.address}
                className="border-b border-border hover:bg-surface-hover even:bg-surface-elevated/50"
              >
                <td className="px-0 py-2 border border-border w-10 shrink-0 min-w-10 text-center">
                  <span className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={selectedAddresses.has(token.address)}
                      onChange={() => onToggleSelect(token.address)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </span>
                </td>
                <td className="px-2 py-2 border border-border whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="flex items-center gap-1">
                    <a
                      href={getExplorerTokenUrl(explorer, token.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline truncate"
                    >
                      {token.symbol}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyAddress(token.address)}
                      className="shrink-0 px-1.5 py-0.5 text-xs border border-border rounded text-text-dim hover:text-text cursor-pointer"
                      title="Copy address"
                    >
                      ⎘
                    </button>
                    {copied === token.address && (
                      <span className="text-positive text-xs">OK</span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-2 border border-border overflow-hidden text-ellipsis">
                  <a
                    href={getExplorerTokenUrl(explorer, token.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:underline truncate block"
                  >
                    {token.name}
                  </a>
                </td>
                <td className="px-2 py-2 border border-border">
                  {formatNumber(token.liquidity)}
                </td>
                <td className="px-2 py-2 border border-border">
                  {formatNumber(token.volume)}
                </td>
                <td className="px-2 py-2 border border-border">
                  {formatNumber(token.mc)}
                </td>
                <td
                  className={`px-2 py-2 border border-border ${
                    getPriceChangeForTimeframe(token, priceChangeTimeframe) > 0
                      ? "text-positive"
                      : getPriceChangeForTimeframe(
                          token,
                          priceChangeTimeframe
                        ) < 0
                      ? "text-negative"
                      : "text-text-muted"
                  }`}
                >
                  {formatPercent(
                    getPriceChangeForTimeframe(token, priceChangeTimeframe)
                  )}
                </td>
                <td
                  className={`px-2 py-2 border border-border ${
                    token.v24hChangePercent > 0
                      ? "text-positive"
                      : "text-negative"
                  } ${sus.volCh ? "bg-warning-muted" : ""}`}
                >
                  {formatPercent(token.v24hChangePercent)}
                </td>
                <td
                  className={`px-2 py-2 border border-border ${
                    sus.volLiq ? "bg-warning-muted" : ""
                  }`}
                >
                  {formatRatio(token.volume_liquidity_ratio)}
                </td>
                <td
                  className={`px-2 py-2 border border-border ${
                    sus.volMc ? "bg-warning-muted" : ""
                  }`}
                >
                  {formatRatio(token.volume_mc_ratio)}
                </td>
                <td
                  className={`px-2 py-2 border border-border ${
                    sus.liqMc ? "bg-warning-muted" : ""
                  }`}
                >
                  {formatRatio(token.liquidity_mc_ratio)}
                </td>
                <td className="px-2 py-2 border border-border text-center w-10 shrink-0">
                  {token.is_pump ? "✓" : ""}
                </td>
                <td className="px-2 py-2 border border-border text-center w-16 shrink-0">
                  <a
                    href={`${BUBBLEMAPS_BASE}${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text hover:text-link"
                    title="Bubblemaps"
                  >
                    🔍
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-8 text-center text-text-dim">
          No tokens match filters.
        </div>
      )}
    </div>
  );
}
