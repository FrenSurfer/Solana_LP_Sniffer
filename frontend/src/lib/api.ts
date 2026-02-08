import type { Token } from "@/types/token";

const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    : "";

export async function fetchTokens(): Promise<Token[]> {
  const res = await fetch(`${API_BASE}/api/tokens`);
  if (!res.ok) throw new Error("Failed to fetch tokens");
  const data = await res.json();
  return data.tokens ?? [];
}

export async function refreshCache(): Promise<{
  success: boolean;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/api/refresh-cache`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) return { success: false, error: data.error ?? "Unknown error" };
  return { success: true };
}

export async function compareTokens(addresses: string[]): Promise<Token[]> {
  const res = await fetch(`${API_BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });
  if (!res.ok) throw new Error("Failed to compare");
  return res.json();
}
