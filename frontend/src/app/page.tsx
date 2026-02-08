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

  const handleSort = useCallback((key: SortKey) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
      } else {
        setSortOrder("desc");
      }
      return key;
    });
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-zinc-300">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-200 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-zinc-100">
            Solana Token Sniffer
          </h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm rounded-lg"
          >
            {refreshing ? "Refreshing…" : "Refresh data"}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search token..."
              className="w-48 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-2 text-zinc-500 hover:text-zinc-200"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600 rounded-lg text-red-300 text-sm">
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

        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCompare}
            disabled={!canCompare || compareLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white text-sm rounded-lg"
          >
            {compareLoading ? "Loading…" : "Compare selected tokens"}
          </button>
          <span className="text-sm text-zinc-500">
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
