"use client";

import { useState, useEffect, useCallback } from "react";
import type { Token } from "@/types/token";
import {
  defaultFilters,
  defaultThresholds,
  EXPLORER_OPTIONS,
  type FilterState,
  type ThresholdState,
  type PriceChangeTimeframe,
  type ExplorerType,
} from "@/types/token";
import { fetchTokens, compareTokens } from "@/lib/api";
import { FiltersPanel } from "@/components/FiltersPanel";
import { TokenTable } from "@/components/TokenTable";
import { ComparisonModal } from "@/components/ComparisonModal";
import type { SortKey } from "@/components/TokenTable";

export default function Home() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilters);
  const [thresholdState, setThresholdState] =
    useState<ThresholdState>(defaultThresholds);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedAddresses, setSelectedAddresses] = useState<Set<string>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<SortKey>("volume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [priceChangeTimeframe, setPriceChangeTimeframe] =
    useState<PriceChangeTimeframe>("24h");
  const [compareModalTokens, setCompareModalTokens] = useState<Token[] | null>(
    null
  );
  const [compareLoading, setCompareLoading] = useState(false);
  const [explorer, setExplorer] = useState<ExplorerType>("gmgn");

  const loadTokens = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchTokens();
      // Deduplicate by address (one row per token)
      const seen = new Set<string>();
      const deduped = data.filter((t) => {
        if (seen.has(t.address)) return false;
        seen.add(t.address);
        return true;
      });
      setTokens(deduped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  useEffect(() => {
    const interval = setInterval(loadTokens, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadTokens]);

  const handleLoadFromCache = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await loadTokens();
    setRefreshing(false);
  }, [loadTokens]);

  const PRICE_TF_TO_SORT_KEY: Record<PriceChangeTimeframe, SortKey> = {
    m5: "price_change_m5",
    h1: "price_change_h1",
    h6: "price_change_h6",
    "24h": "price_change_24h",
  };

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortBy === key) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("desc");
      }
    },
    [sortBy]
  );

  const handlePriceChangeTimeframeChange = useCallback(
    (tf: PriceChangeTimeframe) => {
      setPriceChangeTimeframe(tf);
      setSortBy(PRICE_TF_TO_SORT_KEY[tf]);
      setSortOrder("desc");
    },
    []
  );

  const handleToggleSelect = useCallback((address: string) => {
    setSelectedAddresses((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked: boolean, visibleAddresses: string[]) => {
      setSelectedAddresses(checked ? new Set(visibleAddresses) : new Set());
    },
    []
  );

  const handleCompare = useCallback(async () => {
    const addrs = Array.from(selectedAddresses);
    if (addrs.length < 2) return;
    setCompareLoading(true);
    try {
      const compared = await compareTokens(addrs);
      setCompareModalTokens(compared);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setCompareLoading(false);
    }
  }, [selectedAddresses]);

  const selectedCount = selectedAddresses.size;
  const canCompare = selectedCount >= 2;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-focus-ring border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text p-5 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-5">
        <header className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Solana Token Sniffer
          </h1>
          <button
            type="button"
            onClick={handleLoadFromCache}
            disabled={refreshing}
            className="px-4 py-2.5 bg-button-primary hover:bg-button-primary-hover disabled:bg-input-disabled disabled:cursor-not-allowed text-button-text text-sm font-medium rounded-[var(--radius-md)] cursor-pointer transition-colors shadow-[var(--shadow-sm)]"
          >
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </header>

        {error && (
          <div
            className="p-4 bg-error-bg border border-error-border rounded-[var(--radius-md)] text-error-text text-sm"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            {error}
          </div>
        )}

        <FiltersPanel
          filterState={filterState}
          thresholdState={thresholdState}
          visibleCount={visibleCount}
          onFiltersChange={setFilterState}
          onThresholdsChange={setThresholdState}
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token..."
              className="w-52 px-3.5 py-2.5 bg-surface-elevated border border-input-border rounded-[var(--radius-md)] text-text placeholder-text-dim focus:outline-none focus:border-focus-ring text-sm transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-2 text-text-dim hover:text-text rounded-[var(--radius-sm)] transition-colors"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCompare}
            disabled={!canCompare || compareLoading}
            className="px-4 py-2.5 bg-button-primary hover:bg-button-primary-hover disabled:bg-input-disabled disabled:cursor-not-allowed text-button-text text-sm font-medium rounded-[var(--radius-md)] cursor-pointer transition-colors shadow-[var(--shadow-sm)]"
          >
            {compareLoading ? "Loading…" : "Compare selected tokens"}
          </button>
          <span className="text-sm text-text-dim">
            ({selectedCount} selected)
          </span>
          <span className="flex items-center gap-2 text-sm">
            <label htmlFor="explorer-select" className="text-text-dim">
              Explorer:
            </label>
            <select
              id="explorer-select"
              value={explorer}
              onChange={(e) => setExplorer(e.target.value as ExplorerType)}
              className="px-3 py-2 bg-input-bg border border-input-border rounded-[var(--radius-md)] text-text text-sm focus:outline-none focus:border-focus-ring cursor-pointer"
            >
              {EXPLORER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </span>
        </div>

        <TokenTable
          tokens={tokens}
          filterState={filterState}
          thresholdState={thresholdState}
          searchQuery={searchQuery}
          selectedAddresses={selectedAddresses}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
          onClearSelection={() => setSelectedAddresses(new Set())}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          priceChangeTimeframe={priceChangeTimeframe}
          onPriceChangeTimeframeChange={handlePriceChangeTimeframeChange}
          onVisibleCountChange={setVisibleCount}
          explorer={explorer}
        />
      </div>

      {compareModalTokens && (
        <ComparisonModal
          tokens={compareModalTokens}
          explorer={explorer}
          onClose={() => setCompareModalTokens(null)}
        />
      )}
    </div>
  );
}
