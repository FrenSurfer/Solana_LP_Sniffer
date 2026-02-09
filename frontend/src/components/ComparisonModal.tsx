"use client";

import { useState } from "react";
import type { Token, ExplorerType, PriceChangeTimeframe } from "@/types/token";
import { getExplorerTokenUrl } from "@/types/token";
import { formatNumber, formatRatio } from "@/lib/format";

const PRICE_TF_OPTIONS: { value: PriceChangeTimeframe; label: string }[] = [
  { value: "m5", label: "5m" },
  { value: "h1", label: "1h" },
  { value: "h6", label: "6h" },
  { value: "24h", label: "24h" },
];

function getPriceChangeForTimeframe(
  t: Token,
  tf: PriceChangeTimeframe
): number {
  if (tf === "m5") return t.price_change_m5;
  if (tf === "h1") return t.price_change_h1;
  if (tf === "h6") return t.price_change_h6;
  return t.price_change_24h;
}

/** Numeric value for comparison (which is higher). */
function getCompareValue(
  t: Token,
  key: string,
  priceTf: PriceChangeTimeframe
): number {
  switch (key) {
    case "liquidity":
      return t.liquidity;
    case "volume":
      return t.volume;
    case "mcap":
      return t.mc;
    case "price":
      return getPriceChangeForTimeframe(t, priceTf);
    case "vol-liq":
      return t.volume_liquidity_ratio;
    case "vol-mc":
      return t.volume_mc_ratio;
    case "liq-mc":
      return t.liquidity_mc_ratio;
    default:
      return 0;
  }
}

interface ComparisonModalProps {
  tokens: Token[];
  explorer: ExplorerType;
  onClose: () => void;
}

function buildMetricRows(priceTf: PriceChangeTimeframe): {
  key: string;
  label: string;
  fmt: (t: Token) => React.ReactNode;
}[] {
  return [
    {
      key: "liquidity",
      label: "Liquidity ($)",
      fmt: (t) => formatNumber(t.liquidity),
    },
    {
      key: "volume",
      label: "Volume 24h ($)",
      fmt: (t) => formatNumber(t.volume),
    },
    { key: "mcap", label: "Market Cap ($)", fmt: (t) => formatNumber(t.mc) },
    {
      key: "price",
      label: "Price change %",
      fmt: (t) => {
        const v = getPriceChangeForTimeframe(t, priceTf);
        return (
          <span
            className={v > 0 ? "text-positive" : v < 0 ? "text-negative" : ""}
          >
            {v.toFixed(2)}%
          </span>
        );
      },
    },
    {
      key: "vol-liq",
      label: "Vol/Liq Ratio",
      fmt: (t) => formatRatio(t.volume_liquidity_ratio),
    },
    {
      key: "vol-mc",
      label: "Vol/MC Ratio",
      fmt: (t) => formatRatio(t.volume_mc_ratio),
    },
    {
      key: "liq-mc",
      label: "Liq/MC Ratio",
      fmt: (t) => formatRatio(t.liquidity_mc_ratio),
    },
  ];
}

export function ComparisonModal({
  tokens,
  explorer,
  onClose,
}: ComparisonModalProps) {
  const [priceChangeTimeframe, setPriceChangeTimeframe] =
    useState<PriceChangeTimeframe>("24h");
  const metricRows = buildMetricRows(priceChangeTimeframe);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(metricRows.map((m) => m.key))
  );

  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  const toggleMetric = (key: string) => {
    setVisibleMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[1002] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface-elevated border border-border rounded-lg p-5 w-[90%] max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-text">Token comparison</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFiltersDropdown((v) => !v)}
                className="px-3 py-2 bg-input-bg border border-input-border rounded text-text text-sm hover:bg-surface-hover focus:outline-none focus:border-focus-ring cursor-pointer"
              >
                Metrics {showFiltersDropdown ? "▲" : "▼"}
              </button>
              {showFiltersDropdown && (
                <div className="absolute right-0 top-full mt-1 min-w-[200px] p-2 bg-surface-elevated border border-border rounded shadow-lg z-10">
                  <div className="flex flex-col gap-2">
                    {metricRows.map(({ key, label }) => (
                      <label
                        key={key}
                        className="inline-flex items-center gap-2 cursor-pointer text-sm text-text"
                      >
                        <input
                          type="checkbox"
                          checked={visibleMetrics.has(key)}
                          onChange={() => toggleMetric(key)}
                          className="w-4 h-4 rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text text-2xl leading-none cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
        <div
          className="overflow-x-auto"
          onClick={() => setShowFiltersDropdown(false)}
        >
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold text-text">
                  Metric
                </th>
                {tokens.map((t) => (
                  <th
                    key={t.address}
                    className="text-right py-2 px-2 font-semibold text-text"
                  >
                    <a
                      href={getExplorerTokenUrl(explorer, t.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link hover:underline"
                    >
                      {t.symbol}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows.map(
                (row) =>
                  visibleMetrics.has(row.key) && (
                    <tr
                      key={row.key}
                      className="border-b border-border even:bg-surface-elevated/50"
                    >
                      <td className="text-left py-2 pr-4 font-medium text-text-muted">
                        {row.key === "price" ? (
                          <span className="inline-flex items-center gap-2">
                            {row.label}
                            <select
                              value={priceChangeTimeframe}
                              onChange={(e) =>
                                setPriceChangeTimeframe(
                                  e.target.value as PriceChangeTimeframe
                                )
                              }
                              className="px-2 py-1 bg-input-bg border border-input-border rounded text-text text-sm focus:outline-none focus:border-focus-ring cursor-pointer"
                            >
                              {PRICE_TF_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </span>
                        ) : (
                          row.label
                        )}
                      </td>
                      {tokens.map((t, tokenIndex) => {
                        const values = tokens.map((tk) =>
                          getCompareValue(tk, row.key, priceChangeTimeframe)
                        );
                        const maxVal =
                          values.length > 0 ? Math.max(...values) : 0;
                        const isHigher =
                          values.length > 1 &&
                          values[tokenIndex] === maxVal &&
                          values.some((v, i) => i !== tokenIndex && v < maxVal);
                        return (
                          <td
                            key={t.address}
                            className="text-right py-2 px-2 text-text"
                          >
                            <span className="inline-flex items-center justify-end gap-1.5 w-full">
                              {isHigher && (
                                <span
                                  className="text-positive text-xs shrink-0"
                                  title="Higher value"
                                >
                                  ↑
                                </span>
                              )}
                              {row.fmt(t)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
