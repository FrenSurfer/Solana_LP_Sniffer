"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import type { Token } from "@/types/token";
import type { FilterState, ThresholdState } from "@/types/token";
import { formatNumber, formatPercent, formatRatio } from "@/lib/format";

const GMGN_BASE = "https://gmgn.ai/sol/token/";
const BUBBLEMAPS_BASE = "https://app.bubblemaps.io/sol/token/";

export type SortKey =
  | "symbol"
  | "name"
  | "liquidity"
  | "volume"
  | "mc"
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

function filterToken(
  token: Token,
  filters: FilterState,
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
  if (filters.minPriceChange && token.price_change_24h < filters.minPriceChange)
    return false;
  if (filters.maxPriceChange && token.price_change_24h > filters.maxPriceChange)
    return false;
  return true;
}

export interface TokenTableProps {
  tokens: Token[];
  filterState: FilterState;
  thresholdState: ThresholdState;
  searchQuery: string;
  selectedAddresses: Set<string>;
  onToggleSelect: (address: string) => void;
  onSelectAll: (checked: boolean, visibleAddresses: string[]) => void;
  sortBy: SortKey;
  sortOrder: "asc" | "desc";
  onSort: (key: SortKey) => void;
  onVisibleCountChange?: (n: number) => void;
}

export function TokenTable({
  tokens,
  filterState,
  thresholdState,
  searchQuery,
  selectedAddresses,
  onToggleSelect,
  onSelectAll,
  sortBy,
  sortOrder,
  onSort,
  onVisibleCountChange,
}: TokenTableProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const filtered = useCallback(() => {
    const q = searchQuery.toLowerCase();
    return tokens.filter((token) => {
      const suspicious = isSuspicious(token, thresholdState);
      if (!filterToken(token, filterState, suspicious)) return false;
      if (
        q &&
        !token.symbol.toLowerCase().includes(q) &&
        !token.name.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [tokens, filterState, thresholdState, searchQuery])();

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
    <th className="sticky top-0 z-10 px-3 py-3 bg-zinc-700 border border-zinc-600 text-right font-semibold text-zinc-200 min-w-[80px]">
      <button
        type="button"
        onClick={() => onSort(col)}
        className="flex items-center justify-end gap-1 w-full text-right hover:text-blue-400"
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
    <div className="overflow-x-auto rounded-lg border border-zinc-600">
      <table className="w-full border-collapse text-sm text-right bg-zinc-800 table-fixed">
        <colgroup>
          <col className="w-[3%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[4%]" />
          <col className="w-[5%]" />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky top-0 z-10 px-2 py-3 bg-zinc-700 border border-zinc-600 w-[3%]">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allSelected}
                onChange={(e) =>
                  onSelectAll(e.target.checked, visibleAddresses)
                }
                className="w-4 h-4 cursor-pointer"
              />
            </th>
            <SortHeader col="symbol" label="Symbol" />
            <SortHeader col="name" label="Name" />
            <SortHeader col="liquidity" label="Liq. ($)" />
            <SortHeader col="volume" label="Vol. 24h ($)" />
            <SortHeader col="mc" label="MCap ($)" />
            <SortHeader
              col="price_change_24h"
              label="Δ Prix 24h (%)"
              tooltip="24h price change (DexScreener)"
            />
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
            <SortHeader
              col="is_pump"
              label="Pump"
              tooltip="Address ends with 'pump'"
            />
            <th className="sticky top-0 z-10 px-2 py-3 bg-zinc-700 border border-zinc-600 text-right font-semibold text-zinc-200">
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
                className="border-b border-zinc-600 hover:bg-zinc-700 even:bg-zinc-800/50"
              >
                <td className="px-2 py-2 border border-zinc-600">
                  <input
                    type="checkbox"
                    checked={selectedAddresses.has(token.address)}
                    onChange={() => onToggleSelect(token.address)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-2 border border-zinc-600 whitespace-nowrap overflow-hidden text-ellipsis">
                  <span className="flex items-center gap-1">
                    <a
                      href={`${GMGN_BASE}${token.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline truncate"
                    >
                      {token.symbol}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyAddress(token.address)}
                      className="shrink-0 px-1.5 py-0.5 text-xs border border-zinc-600 rounded text-zinc-500 hover:text-zinc-200"
                      title="Copy address"
                    >
                      ⎘
                    </button>
                    {copied === token.address && (
                      <span className="text-emerald-500 text-xs">OK</span>
                    )}
                  </span>
                </td>
                <td className="px-2 py-2 border border-zinc-600 overflow-hidden text-ellipsis">
                  <a
                    href={`${GMGN_BASE}${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate block"
                  >
                    {token.name}
                  </a>
                </td>
                <td className="px-2 py-2 border border-zinc-600">
                  {formatNumber(token.liquidity)}
                </td>
                <td className="px-2 py-2 border border-zinc-600">
                  {formatNumber(token.volume)}
                </td>
                <td className="px-2 py-2 border border-zinc-600">
                  {formatNumber(token.mc)}
                </td>
                <td
                  className={`px-2 py-2 border border-zinc-600 ${
                    token.price_change_24h > 0
                      ? "text-emerald-500"
                      : token.price_change_24h < 0
                      ? "text-red-500"
                      : "text-zinc-400"
                  }`}
                >
                  {formatPercent(token.price_change_24h)}
                </td>
                <td
                  className={`px-2 py-2 border border-zinc-600 ${
                    token.v24hChangePercent > 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  } ${sus.volCh ? "bg-amber-500/20" : ""}`}
                >
                  {formatPercent(token.v24hChangePercent)}
                </td>
                <td
                  className={`px-2 py-2 border border-zinc-600 ${
                    sus.volLiq ? "bg-amber-500/20" : ""
                  }`}
                >
                  {formatRatio(token.volume_liquidity_ratio)}
                </td>
                <td
                  className={`px-2 py-2 border border-zinc-600 ${
                    sus.volMc ? "bg-amber-500/20" : ""
                  }`}
                >
                  {formatRatio(token.volume_mc_ratio)}
                </td>
                <td
                  className={`px-2 py-2 border border-zinc-600 ${
                    sus.liqMc ? "bg-amber-500/20" : ""
                  }`}
                >
                  {formatRatio(token.liquidity_mc_ratio)}
                </td>
                <td className="px-2 py-2 border border-zinc-600 text-center">
                  {token.is_pump ? "✓" : ""}
                </td>
                <td className="px-2 py-2 border border-zinc-600 text-center">
                  <a
                    href={`${BUBBLEMAPS_BASE}${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-blue-400"
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
        <div className="py-8 text-center text-zinc-500">
          No tokens match filters.
        </div>
      )}
    </div>
  );
}
