"use client";

import { useState, useEffect, useCallback } from "react";
import type { Token } from "@/types/token";
import {
  defaultFilters,
  defaultThresholds,
  type FilterState,
  type ThresholdState,
} from "@/types/token";
import { fetchTokens, refreshCache, compareTokens } from "@/lib/api";
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
  const [compareModalTokens, setCompareModalTokens] = useState<Token[] | null>(
    null
  );
  const [compareLoading, setCompareLoading] = useState(false);

  const loadTokens = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchTokens();
      setTokens(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const result = await refreshCache();
    setRefreshing(false);
    if (result.success) {
      await loadTokens();
    } else {
      setError(result.error ?? "Refresh failed");
    }
  }, [loadTokens]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortBy === key) {
        // Même colonne : on alterne desc → asc → desc
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        // Nouvelle colonne : on trie par défaut en décroissant
        setSortBy(key);
        setSortOrder("desc");
      }
    },
    [sortBy]
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
    <div className="min-h-screen bg-background text-text p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-text">Solana Token Sniffer</h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-button-primary hover:bg-button-primary-hover disabled:bg-input-disabled disabled:cursor-not-allowed text-button-text text-sm rounded-lg"
          >
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-error-bg border border-error-border rounded-lg text-error-text text-sm">
            {error}
          </div>
        )}

        <FiltersPanel
          filterState={filterState}
          thresholdState={thresholdState}
          visibleCount={visibleCount}
          onFiltersChange={setFilterState}
          onThresholdsChange={setThresholdState}
          onApply={() => {}}
        />

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token..."
              className="w-48 px-3 py-2 bg-surface-elevated border border-input-border rounded-lg text-text placeholder-text-dim focus:outline-none focus:border-focus-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-2 text-text-dim hover:text-text"
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
            className="px-4 py-2 bg-button-primary hover:bg-button-primary-hover disabled:bg-input-disabled disabled:cursor-not-allowed text-button-text text-sm rounded-lg"
          >
            {compareLoading ? "Loading…" : "Compare selected tokens"}
          </button>
          <span className="text-sm text-text-dim">
            ({selectedCount} selected)
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
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onVisibleCountChange={setVisibleCount}
        />
      </div>

      {compareModalTokens && (
        <ComparisonModal
          tokens={compareModalTokens}
          onClose={() => setCompareModalTokens(null)}
        />
      )}
    </div>
  );
}
