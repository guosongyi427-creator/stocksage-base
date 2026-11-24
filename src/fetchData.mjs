// Data layer for StockSage.
// Sources (all public, no API key):
//  - Coinbase Tokenized Stocks API: https://api.coinbase.com/v1/tokenized-stocks
//    (415 tokens, contract addresses, multipliers, supply, Chainlink NAV reference)
//  - DexScreener: https://api.dexscreener.com/latest/dex/tokens/{address}
//    (live DEX price, 24h change, volume, liquidity on Aerodrome/Base)
// DexScreener needs a browser User-Agent or it returns 403.

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36" };
const TS_API = "https://api.coinbase.com/v1/tokenized-stocks";

async function getJSON(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.json();
}

/** Fetch the full tokenized-stock list (paginated). Returns array of token records. */
export async function fetchTokenList() {
  const all = [];
  let pageToken = null;
  for (let i = 0; i < 10; i++) {
    const url = pageToken ? `${TS_API}?page_token=${encodeURIComponent(pageToken)}` : TS_API;
    const d = await getJSON(url);
    all.push(...(d.tokens || []));
    pageToken = d.next_page_token || null;
    if (!pageToken) break;
  }
  return all;
}

/** Fetch live DEX data for one token contract address on Base. Returns the best (deepest-liquidity) Base pair or null. */
export async function fetchDexPair(contractAddress) {
  const d = await getJSON(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`, UA);
  const pairs = (d.pairs || []).filter((p) => p.chainId === "base");
  if (!pairs.length) return null;
  pairs.sort((a, b) => Number(b.liquidity?.usd || 0) - Number(a.liquidity?.usd || 0));
  const p = pairs[0];
  return {
    dex: p.dexId,
    pairAddress: p.pairAddress,
    priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
    change24h: p.priceChange?.h24 != null ? Number(p.priceChange.h24) : null,
    change6h: p.priceChange?.h6 != null ? Number(p.priceChange.h6) : null,
    change1h: p.priceChange?.h1 != null ? Number(p.priceChange.h1) : null,
    volume24h: p.volume?.h24 != null ? Number(p.volume.h24) : null,
    liquidityUsd: p.liquidity?.usd != null ? Number(p.liquidity.usd) : null,
    fdv: p.fdv != null ? Number(p.fdv) : null,
    url: p.url,
  };
}

/** Fetch DexScreener data for many tokens, with a small concurrency limit and rate-limit tolerance. */
export async function fetchDexForTokens(tokens, concurrency = 5) {
  const out = new Map();
  const queue = [...tokens];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        const pair = await fetchDexPair(t.contract_address);
        out.set(t.symbol, pair);
      } catch (e) {
        out.set(t.symbol, null);
      }
      // be polite to DexScreener
      await new Promise((r) => setTimeout(r, 120));
    }
  });
  await Promise.all(workers);
  return out;
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
