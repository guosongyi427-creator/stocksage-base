// Research brief: canonical JSON + content hash.
// The hash is keccak256 of the canonical (key-sorted) brief JSON. That hash is
// what the agent anchors on-chain in ResearchRegistry, so anyone can verify
// that a published brief matches the on-chain record byte-for-byte.
import { keccak256, toHex } from "viem";

export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

export function briefHash(brief) {
  const canonical = stableStringify(brief);
  return keccak256(toHex(canonical));
}

/** Build the publishable brief object from an analysis + run metadata. */
export function buildBrief(analysis, runId, generatedAt) {
  const brief = {
    agent: "StockSage",
    version: 1,
    runId,
    generatedAt,
    symbol: analysis.symbol,
    name: analysis.name,
    contract: analysis.contract,
    isin: analysis.isin,
    multiplier: analysis.multiplier,
    totalSupply: analysis.totalSupply,
    navPrice: analysis.navPrice,
    navUpdatedAt: analysis.navUpdatedAt,
    dex: analysis.dex,
    premiumPct: analysis.premiumPct,
    components: analysis.components,
    score: analysis.score,
    verdict: analysis.verdict,
    reasons: analysis.reasons,
    riskFlags: analysis.riskFlags,
    disclaimer:
      "Research only, not investment advice. Tokenized stocks are volatile; " +
      "DEX prices can deviate from the Chainlink NAV reference. Do your own research.",
  };
  brief.contentHash = briefHash(brief);
  return brief;
}
