// StockSage scoring model — transparent, rules-based, deterministic.
// No black box: every point of the score is explained by a named component.
// Score range: -100 (strong avoid) .. +100 (strong watch).
//
// Components (weights sum to 1):
//  1. Momentum 30% — 24h price change (clamped). Strong up-move = positive.
//  2. Volume & liquidity health 25% — deep liquidity + real 24h volume = healthy market.
//  3. NAV premium / discount 25% — DEX price vs Chainlink NAV reference.
//     A small discount is an opportunity; a premium means overpaying; a large
//     discount signals distress/illiquidity. Tight tracking (|premium| < 0.5%) is good.
//  4. Adoption 20% — normalized total supply (more minted = more real usage).
//
// Risk flags are reported separately and do not hide inside the score.

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function momentumScore(change24h) {
  if (change24h == null) return { score: 0, note: "no 24h change data" };
  // 25% move -> ~100; linear in between
  const s = clamp(change24h * 4, -100, 100);
  return { score: s, note: `24h ${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%` };
}

function liquidityScore(volume24h, liquidityUsd) {
  // log-scale: $10k vol -> ~20, $1M vol -> ~70, $10M+ vol -> ~95
  const vol = volume24h != null ? Math.log10(Math.max(volume24h, 1)) : 0;
  const liq = liquidityUsd != null ? Math.log10(Math.max(liquidityUsd, 1)) : 0;
  const volScore = clamp((vol - 3) * 28, 0, 100); // $1k->0, $100k->~56, $10M->~100
  const liqScore = clamp((liq - 3) * 30, 0, 100); // $1k->0, $100k->~60, $1M->~90
  const s = Math.round(volScore * 0.6 + liqScore * 0.4);
  return { score: s, note: `24h vol $${fmtUSD(volume24h)}, liquidity $${fmtUSD(liquidityUsd)}` };
}

function navScore(dexPrice, navPrice) {
  if (dexPrice == null || navPrice == null || navPrice <= 0) {
    return { score: 0, note: "no NAV reference available", premiumPct: null };
  }
  const premiumPct = ((dexPrice - navPrice) / navPrice) * 100;
  let s;
  let note;
  if (Math.abs(premiumPct) < 0.5) { s = 80; note = `tracks NAV tightly (${premiumPct.toFixed(2)}%)`; }
  else if (premiumPct >= 0.5 && premiumPct < 2) { s = 30; note = `small premium to NAV (+${premiumPct.toFixed(2)}%)`; }
  else if (premiumPct >= 2 && premiumPct < 5) { s = -30; note = `premium to NAV (+${premiumPct.toFixed(2)}%) — overpaying vs reference`; }
  else if (premiumPct >= 5) { s = -70; note = `large premium to NAV (+${premiumPct.toFixed(2)}%)`; }
  else if (premiumPct <= -0.5 && premiumPct > -2) { s = 60; note = `small discount to NAV (${premiumPct.toFixed(2)}%) — possible value`; }
  else if (premiumPct <= -2 && premiumPct > -5) { s = 10; note = `discount to NAV (${premiumPct.toFixed(2)}%) — check liquidity`; }
  else { s = -50; note = `large discount to NAV (${premiumPct.toFixed(2)}%) — distress or thin market`; }
  return { score: s, note, premiumPct };
}

function adoptionScore(totalSupply, maxSupply) {
  if (totalSupply == null || maxSupply <= 0) return { score: 0, note: "no supply data" };
  const ratio = totalSupply / maxSupply;
  const s = Math.round(clamp(Math.log10(ratio * 100 + 1) * 55, 0, 100));
  return { score: s, note: `supply ${fmtNum(totalSupply)} tokens` };
}

export function fmtUSD(v) {
  if (v == null) return "n/a";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
export function fmtNum(v) {
  if (v == null) return "n/a";
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${Number(v).toFixed(2)}`;
}

/**
 * Analyze one token. `token` is a Tokenized Stocks API record; `dex` is the
 * DexScreener pair (or null); `maxSupply` is the max supply across the universe.
 * Returns a full analysis object.
 */
export function analyzeToken(token, dex, maxSupply) {
  const symbol = token.symbol;
  const dexPrice = dex?.priceUsd ?? null;
  const navPrice = token.nav_price != null ? Number(token.nav_price) : null;
  const totalSupply = token.total_supply != null ? Number(token.total_supply) : null;
  const multiplier = token.multiplier != null ? Number(token.multiplier) : null;

  const m = momentumScore(dex?.change24h ?? null);
  const l = liquidityScore(dex?.volume24h ?? null, dex?.liquidityUsd ?? null);
  const n = navScore(dexPrice, navPrice);
  const a = adoptionScore(totalSupply, maxSupply);

  const score = Math.round(
    clamp(m.score * 0.30 + l.score * 0.25 + n.score * 0.25 + a.score * 0.20, -100, 100)
  );

  const riskFlags = [];
  if (dex == null) riskFlags.push("no live DEX market found on Base");
  if (dex?.liquidityUsd != null && dex.liquidityUsd < 100000) riskFlags.push("thin liquidity (< $100K)");
  if (dex?.volume24h != null && dex.volume24h < 10000) riskFlags.push("very low 24h volume (< $10K)");
  if (n.premiumPct != null && Math.abs(n.premiumPct) >= 5) riskFlags.push(`large NAV deviation (${n.premiumPct.toFixed(2)}%)`);
  if (navPrice == null) riskFlags.push("no Chainlink NAV reference configured");
  if (token.paused_features && token.paused_features.length) riskFlags.push(`paused features: ${token.paused_features.join(", ")}`);
  if (totalSupply == null || totalSupply === 0) riskFlags.push("zero / unknown supply");

  const reasons = [
    `Momentum: ${m.note}`,
    `Market health: ${l.note}`,
    `NAV: ${n.note}`,
    `Adoption: ${a.note}`,
  ];

  let verdict;
  if (score >= 60) verdict = "Strong watch";
  else if (score >= 25) verdict = "Watch";
  else if (score >= -10) verdict = "Neutral";
  else if (score >= -50) verdict = "Caution";
  else verdict = "Avoid";

  return {
    symbol,
    name: token.name,
    contract: token.contract_address,
    isin: token.isin || null,
    multiplier,
    totalSupply,
    navPrice,
    navUpdatedAt: token.nav_price_updated_at || null,
    dex: dex ? {
      priceUsd: dex.priceUsd, change24h: dex.change24h, change6h: dex.change6h,
      change1h: dex.change1h, volume24h: dex.volume24h, liquidityUsd: dex.liquidityUsd,
      dex: dex.dex, pairAddress: dex.pairAddress, url: dex.url,
    } : null,
    components: { momentum: m.score, liquidity: l.score, nav: n.score, adoption: a.score },
    premiumPct: n.premiumPct,
    score,
    verdict,
    reasons,
    riskFlags,
  };
}
