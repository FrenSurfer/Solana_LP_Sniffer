"use client";

import { useState } from "react";
import type { Token, ExplorerType } from "@/types/token";
import { getExplorerTokenUrl } from "@/types/token";
import { formatNumber, formatRatio } from "@/lib/format";

interface ComparisonModalProps {
  tokens: Token[];
  explorer: ExplorerType;
  onClose: () => void;
}

const metricRows: {
  key: string;
  label: string;
  fmt: (t: Token) => React.ReactNode;
}[] = [
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
    label: "Price change (%)",
    fmt: (t) => (
      <span
        className={t.price_change_24h > 0 ? "text-positive" : "text-negative"}
      >
        {t.price_change_24h.toFixed(2)}%
      </span>
    ),
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

export function ComparisonModal({
  tokens,
  explorer,
  onClose,
}: ComparisonModalProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(
    new Set(metricRows.map((m) => m.key))
  );

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
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mb-3 p-2 bg-surface-hover rounded">
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
        <div className="overflow-x-auto">
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
                        {row.label}
                      </td>
                      {tokens.map((t) => (
                        <td
                          key={t.address}
                          className="text-right py-2 px-2 text-text"
                        >
                          {row.fmt(t)}
                        </td>
                      ))}
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
