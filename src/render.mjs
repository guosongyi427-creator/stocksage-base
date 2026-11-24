// Render the public dashboard (dashboard/index.html) from data/briefs.json.
// The brief data is embedded directly in the page (no fetch, no CDN), so the
// dashboard opens correctly from file:// and from any static host.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASESCAN_SEPOLIA = "https://sepolia.basescan.org";
const BASESCAN_MAIN = "https://basescan.org";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtUSD(v) {
  if (v == null) return "—";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(2) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(1) + "K";
  return "$" + Number(v).toFixed(2);
}
function verdictClass(v) {
  return { "Strong watch": "v-strong", "Watch": "v-watch", "Neutral": "v-neutral", "Caution": "v-caution", "Avoid": "v-avoid" }[v] || "v-neutral";
}

export function renderDashboard() {
  const data = JSON.parse(readFileSync(new URL("../data/briefs.json", import.meta.url), "utf8"));
  const run = JSON.parse(readFileSync(new URL("../data/run.json", import.meta.url), "utf8"));
  const { briefs, generatedAt, registry } = data;
  const anchored = run.anchors.filter((a) => a.status === "anchored");
  const rows = briefs.map((b) => {
    const a = run.anchors.find((x) => x.symbol === b.symbol) || {};
    const dex = b.dex;
    const anchorCell = a.status === "anchored"
      ? `<a href="${BASESCAN_SEPOLIA}/tx/${a.txHash}" target="_blank" rel="noopener">tx ${esc(a.txHash.slice(0, 10))}…</a>`
      : `<span class="muted">pending</span>`;
    const change = dex?.change24h;
    const changeHtml = change == null ? "—"
      : `<span class="${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${change.toFixed(2)}%</span>`;
    return `<tr>
      <td><strong>${esc(b.symbol)}</strong><br><span class="muted">${esc(b.name)}</span></td>
      <td>${dex?.priceUsd != null ? "$" + Number(dex.priceUsd).toFixed(2) : "—"}</td>
      <td>${changeHtml}</td>
      <td>${fmtUSD(dex?.volume24h)}</td>
      <td>${fmtUSD(dex?.liquidityUsd)}</td>
      <td>${b.premiumPct != null ? (b.premiumPct >= 0 ? "+" : "") + b.premiumPct.toFixed(2) + "%" : "—"}</td>
      <td><span class="score">${b.score}</span></td>
      <td><span class="verdict ${verdictClass(b.verdict)}">${esc(b.verdict)}</span></td>
      <td class="small">${b.riskFlags.length ? esc(b.riskFlags.join("; ")) : "—"}</td>
      <td class="small mono">${esc(b.contentHash.slice(0, 14))}…<br>${anchorCell}</td>
    </tr>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>StockSage — Agentic research on tokenized stocks (Base)</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0;background:#0b0f17;color:#e6edf3;line-height:1.5}
  .wrap{max-width:1080px;margin:0 auto;padding:28px 18px 60px}
  h1{font-size:28px;margin:0 0 4px} h1 span{color:#4da3ff}
  .sub{color:#9aa7b8;margin:0 0 18px}
  .card{background:#121826;border:1px solid #232c3d;border-radius:12px;padding:16px 18px;margin:16px 0}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
  .stat b{font-size:22px;display:block}.stat span{color:#9aa7b8;font-size:13px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #232c3d;vertical-align:top}
  th{color:#9aa7b8;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:#9aa7b8}.small{font-size:12px}.mono{font-family:ui-monospace,Menlo,monospace}
  .up{color:#3fb950}.down{color:#f85149}
  .score{font-weight:700;font-size:16px}
  .verdict{padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
  .v-strong{background:#1f6feb;color:#fff}.v-watch{background:#1a7f37;color:#fff}
  .v-neutral{background:#30363d;color:#e6edf3}.v-caution{background:#9e6a03;color:#fff}.v-avoid{background:#da3633;color:#fff}
  a{color:#4da3ff} code{background:#1c2433;padding:1px 5px;border-radius:5px;font-size:13px}
  .foot{color:#9aa7b8;font-size:13px}
</style></head><body><div class="wrap">
<h1>StockSage <span>· tokenized-stock research agent</span></h1>
<p class="sub">An autonomous agent that researches Coinbase tokenized stocks on Base and anchors every research brief on-chain. Built for the Base Stocks Maxxing Season — Agentic Stock Finance track.</p>
<div class="card"><div class="grid">
  <div class="stat"><b>${briefs.length}</b><span>tokens covered</span></div>
  <div class="stat"><b>${briefs.filter((b) => b.dex).length}</b><span>with live DEX markets</span></div>
  <div class="stat"><b>${anchored.length}</b><span>briefs anchored on-chain</span></div>
  <div class="stat"><b>${esc(generatedAt.slice(0, 10))}</b><span>last run (UTC)</span></div>
</div></div>
<div class="card">
  <strong>On-chain registry (Base Sepolia testnet)</strong><br>
  ${registry
    ? `<code>${esc(registry)}</code> — <a href="${BASESCAN_SEPOLIA}/address/${esc(registry)}" target="_blank" rel="noopener">view on Basescan</a>`
    : `<span class="muted">Contract compiled and ready; deployment pending a funded testnet wallet (see README). Brief hashes below are final and anchorable unchanged.</span>`}
  <p class="small muted" style="margin:10px 0 0">Each brief's content hash is keccak256 of its canonical JSON. Anchoring the hash on-chain proves what was published, when, and by whom — without putting the full text on-chain.</p>
</div>
<div class="card" style="overflow-x:auto"><table>
<thead><tr><th>Token</th><th>DEX price</th><th>24h</th><th>24h vol</th><th>Liquidity</th><th>NAV prem.</th><th>Score</th><th>Verdict</th><th>Risk flags</th><th>Brief hash / anchor</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<div class="card">
  <strong>How the score works (transparent, rules-based)</strong>
  <p class="small">Momentum 30% (24h price change) · Market health 25% (24h volume + liquidity) · NAV premium/discount 25% (DEX price vs Chainlink NAV reference) · Adoption 20% (total supply). Every component is shown in the brief JSON; nothing is a black box. Data: Coinbase Tokenized Stocks API (415 tokens, no key) + DexScreener live Aerodrome prices.</p>
  <p class="small">Methodology and full source: <a href="https://github.com/guosongyi427-creator/stocksage-base" target="_blank" rel="noopener">github.com/guosongyi427-creator/stocksage-base</a> (repo link updated on publish).</p>
</div>
<p class="foot">Research only, not investment advice. Tokenized stocks are volatile; DEX prices can deviate from the Chainlink NAV reference. Do your own research. StockSage is an independent research tool, not affiliated with Coinbase, Base, or any issuer.</p>
</div></body></html>`;

  mkdirSync(new URL("../dashboard", import.meta.url), { recursive: true });
  writeFileSync(new URL("../dashboard/index.html", import.meta.url), html);
  writeFileSync(new URL("../dashboard/briefs.json", import.meta.url), JSON.stringify(data, null, 2));
  console.log("dashboard written: dashboard/index.html");
  return html;
}

// allow direct run: node src/render.mjs
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split(/[\\/]/).pop())) {
  renderDashboard();
}
