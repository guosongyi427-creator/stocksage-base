// StockSage agent — main run.
//   node src/agent.mjs [--top N] [--symbols AAPLc,TSLAc,...]
//
// 1. Fetch the Coinbase tokenized-stock list (415 tokens).
// 2. Pick a watchlist: top N by total supply (default 20), or an explicit symbol list.
// 3. Fetch live DexScreener data (Aerodrome/Base) for each.
// 4. Score each with the transparent rules-based model.
// 5. Build a research brief per token + a daily digest.
// 6. Anchor each brief's content hash on-chain (Base Sepolia) when a funded
//    registry is configured; otherwise record it as pending with the hash.
// 7. Write data/briefs.json, data/digest.md, data/run.json (the dashboard reads briefs.json).
import { writeFileSync, mkdirSync } from "node:fs";
import { fetchTokenList, fetchDexForTokens, num } from "./fetchData.mjs";
import { analyzeToken } from "./analyze.mjs";
import { buildBrief } from "./brief.mjs";
import { anchorBrief, anchorConfig } from "./anchor.mjs";
import { renderDashboard } from "./render.mjs";

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  const m = argv[i].match(/^--([^=]+)(?:=(.*))?$/);
  if (!m) continue;
  if (m[2] !== undefined) args[m[1]] = m[2];
  else if (argv[i + 1] && !argv[i + 1].startsWith("--")) args[m[1]] = argv[++i];
  else args[m[1]] = true;
}
const TOP_N = Number(args.top || 20);
const SYMBOLS = args.symbols ? String(args.symbols).split(",").map((s) => s.trim()) : null;

const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";
const generatedAt = new Date().toISOString();

console.log(`StockSage run ${runId}`);
console.log("1) fetching tokenized-stock list from Coinbase API ...");
const tokens = await fetchTokenList();
console.log(`   ${tokens.length} tokens on Base`);

const maxSupply = Math.max(...tokens.map((t) => num(t.total_supply) || 0));
let watchlist;
if (SYMBOLS) {
  const bySym = new Map(tokens.map((t) => [t.symbol, t]));
  watchlist = SYMBOLS.map((s) => bySym.get(s)).filter(Boolean);
  console.log(`   watchlist: explicit symbols (${watchlist.length})`);
} else {
  watchlist = [...tokens]
    .sort((a, b) => (num(b.total_supply) || 0) - (num(a.total_supply) || 0))
    .slice(0, TOP_N);
  console.log(`   watchlist: top ${TOP_N} by total supply`);
}

console.log("2) fetching live DEX data (DexScreener / Aerodrome) ...");
const dexMap = await fetchDexForTokens(watchlist);
const withDex = [...dexMap.values()].filter(Boolean).length;
console.log(`   live DEX pairs found for ${withDex}/${watchlist.length}`);

console.log("3) scoring + building briefs ...");
const briefs = [];
for (const t of watchlist) {
  const analysis = analyzeToken(t, dexMap.get(t.symbol) || null, maxSupply);
  const brief = buildBrief(analysis, runId, generatedAt);
  briefs.push(brief);
  console.log(
    `   ${brief.symbol.padEnd(8)} score ${String(brief.score).padStart(4)} ${brief.verdict.padEnd(13)} ` +
    `price $${brief.dex?.priceUsd ?? "n/a"} 24h ${brief.dex?.change24h ?? "n/a"}% hash ${brief.contentHash.slice(0, 12)}...`
  );
}

// digest: movers + best/worst
const scored = briefs.filter((b) => b.dex);
const withChange = scored.filter((b) => b.dex.change24h != null);
const byChange = [...withChange].sort((a, b) => (b.dex.change24h || 0) - (a.dex.change24h || 0));
const byScore = [...briefs].sort((a, b) => b.score - a.score);
const digest = {
  runId, generatedAt,
  universe: tokens.length,
  covered: briefs.length,
  topGainers24h: byChange.slice(0, 5).map((b) => ({ symbol: b.symbol, change24h: b.dex.change24h, price: b.dex.priceUsd })),
  topLosers24h: byChange.slice(-5).reverse().map((b) => ({ symbol: b.symbol, change24h: b.dex.change24h, price: b.dex.priceUsd })),
  bestScores: byScore.slice(0, 5).map((b) => ({ symbol: b.symbol, score: b.score, verdict: b.verdict })),
  worstScores: byScore.slice(-5).reverse().map((b) => ({ symbol: b.symbol, score: b.score, verdict: b.verdict })),
};

console.log("4) anchoring briefs on-chain (Base Sepolia) ...");
const cfg = anchorConfig();
console.log(`   registry: ${cfg.registryAddress || "(not deployed — set REGISTRY_ADDRESS in .env)"}`);
const anchors = [];
for (const brief of briefs) {
  const res = await anchorBrief(brief);
  anchors.push({ symbol: brief.symbol, contentHash: brief.contentHash, ...res });
  if (res.status === "anchored") console.log(`   ${brief.symbol}: ANCHORED tx ${res.txHash}`);
  else console.log(`   ${brief.symbol}: ${res.status} — ${res.reason || res.error || ""}`);
}

mkdirSync(new URL("../data", import.meta.url), { recursive: true });
mkdirSync(new URL("../data/briefs", import.meta.url), { recursive: true });
writeFileSync(new URL("../data/briefs.json", import.meta.url), JSON.stringify({ runId, generatedAt, registry: cfg.registryAddress, briefs }, null, 2));
writeFileSync(new URL("../data/digest.json", import.meta.url), JSON.stringify(digest, null, 2));
writeFileSync(new URL("../data/run.json", import.meta.url), JSON.stringify({ runId, generatedAt, anchors, digest }, null, 2));
for (const brief of briefs) {
  writeFileSync(new URL(`../data/briefs/${brief.symbol}.json`, import.meta.url), JSON.stringify(brief, null, 2));
}

// markdown digest for humans / X thread
const md = [
  `# StockSage daily brief — ${generatedAt.slice(0, 10)}`,
  ``,
  `Agentic research on Coinbase tokenized stocks (Base). ${briefs.length} tokens covered, ${withDex} with live DEX markets. Scores are rules-based and reproducible; each brief's content hash is anchored on-chain (Base Sepolia) when a registry is configured.`,
  ``,
  `## Top gainers (24h)`,
  ...digest.topGainers24h.map((x) => `- ${x.symbol}: ${x.change24h >= 0 ? "+" : ""}${x.change24h}% @ $${x.price}`),
  ``,
  `## Top losers (24h)`,
  ...digest.topLosers24h.map((x) => `- ${x.symbol}: ${x.change24h}% @ $${x.price}`),
  ``,
  `## Best scores`,
  ...digest.bestScores.map((x) => `- ${x.symbol}: ${x.score} (${x.verdict})`),
  ``,
  `## Worst scores`,
  ...digest.worstScores.map((x) => `- ${x.symbol}: ${x.score} (${x.verdict})`),
  ``,
  `_Research only, not investment advice._`,
  ``,
].join("\n");
writeFileSync(new URL("../data/digest.md", import.meta.url), md);

const anchored = anchors.filter((a) => a.status === "anchored").length;
console.log(`\nDone. ${briefs.length} briefs, ${anchored} anchored on-chain, ${anchors.length - anchored} pending.`);
console.log(`Outputs: data/briefs.json, data/digest.json, data/digest.md, data/run.json`);
renderDashboard();
