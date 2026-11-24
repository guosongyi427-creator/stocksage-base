# StockSage — Agentic research on tokenized stocks (Base)

An autonomous research agent for **Coinbase tokenized stocks on Base**. It reads the
live market, scores every tokenized stock with a transparent rules-based model, and
anchors each research brief on-chain — so anyone can verify what was published,
when, and by whom.

Built for the **Base Stocks Maxxing Season** (Nov 5 – Dec 12, 2026), track:
**Agentic Stock Finance** — agents that research, earn, or trade around tokenized stocks.

> Research only, not investment advice. Tokenized stocks are volatile; DEX prices can
> deviate from the Chainlink NAV reference. Do your own research.

## What it does

1. **Fetches the real universe** — all 415 Coinbase tokenized stocks from the public
   Tokenized Stocks API (`api.coinbase.com/v1/tokenized-stocks`, no key required):
   contract address, symbol, name, multiplier, total supply, Chainlink NAV reference.
2. **Reads the live market** — DexScreener (Aerodrome on Base) for live DEX price,
   24h change, 24h volume, and liquidity per token.
3. **Scores transparently** — a deterministic, rules-based model (no black box):
   - Momentum 30% — 24h price change
   - Market health 25% — 24h volume + liquidity
   - NAV premium/discount 25% — DEX price vs Chainlink NAV reference
   - Adoption 20% — normalized total supply
   - Every component is shown in the brief; risk flags (thin liquidity, large NAV
     deviation, no NAV feed, no live market) are listed separately.
4. **Publishes a brief per token** — score, verdict (Strong watch / Watch / Neutral /
   Caution / Avoid), reasons, risk flags, and a `contentHash` (keccak256 of the
   canonical brief JSON).
5. **Anchors the hash on-chain** — `ResearchRegistry` (Base Sepolia) stores the brief
   hash, symbol, score, timestamp, and author. One transaction per brief. Anyone can
   verify a brief by recomputing its hash and reading the registry.
6. **Renders a public dashboard** — `dashboard/index.html` (static, no build, no CDN):
   the full table, scores, on-chain proofs, and methodology.

## Latest run (2026-11-24)

Top 20 tokens by total supply. Headline: **NVDAc scored 90 (Strong watch)** —
$162.54, +21.22% in 24h, $38.4M volume, tracking NAV within -0.22%. Full output in
`data/briefs.json`, `data/digest.json`, `data/digest.md`; dashboard in `dashboard/`.

## Run it

Requires Node.js 18+ and nothing else (no API keys).

```sh
npm install
node src/agent.mjs --top 20            # research the top 20 tokens by supply
node src/agent.mjs --symbols NVDAc,TSLAc,ANTc   # or a specific watchlist
```

Output: `data/briefs.json`, `data/digest.json`, `data/digest.md`, `data/run.json`,
and a regenerated `dashboard/index.html`.

## On-chain registry

Contract: `contracts/ResearchRegistry.sol` (Solidity 0.8.20, MIT).
Compiled artifact: `contracts/ResearchRegistry.json` (ABI + bytecode).

Deploy to Base Sepolia (testnet):

```sh
# 1. Fund the deployer wallet with Base Sepolia ETH (testnet, free) from a faucet:
#    https://www.alchemy.com/faucets/base-sepolia  (0.1 ETH/day)
#    https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
#    Deployer address is in .env (DEPLOYER_ADDRESS).
# 2. Deploy:
node scripts/deploy.mjs
# 3. Anchor the latest briefs:
node src/agent.mjs --top 20
```

Deployment status: contract compiled and deploy script tested; **deployment is pending
a funded testnet wallet** (every public Base Sepolia faucet requires either a browser
captcha, a wallet-connect session, or mainnet ETH on the address — none of which a
headless agent can complete alone). The brief content hashes are final and anchorable
unchanged once the registry is deployed: re-running the agent after `deploy.mjs`
anchors them automatically.

## Project layout

```
contracts/ResearchRegistry.sol    on-chain brief registry
contracts/ResearchRegistry.json   compiled ABI + bytecode
src/fetchData.mjs                 Tokenized Stocks API + DexScreener
src/analyze.mjs                   transparent scoring model
src/brief.mjs                     canonical brief JSON + keccak256 hash
src/anchor.mjs                    Base Sepolia anchoring (viem)
src/agent.mjs                     main run: fetch -> score -> brief -> anchor -> dashboard
src/render.mjs                    static dashboard generator
scripts/compile.mjs               compile the contract (solc-js)
scripts/deploy.mjs                deploy to Base Sepolia
dashboard/index.html              public dashboard (static, self-contained)
data/briefs.json                  latest run: all briefs
data/digest.json / digest.md      daily digest (movers, best/worst scores)
```

## Scoring honesty

- 50% of the Quest score is real on-chain usage/traction. StockSage's honest answer:
  the agent itself is a real on-chain user — every research run anchors its briefs as
  real transactions in a public registry anyone can use. We do not fake users,
  wash-trade, or inflate metrics.
- 25% is product quality: real data, real scoring, a working dashboard, open source.
- 25% is public build activity: this repo, the dashboard, and the build-in-public
  X posts (see `SUBMISSION.md`).

## License

MIT — see `LICENSE`.
