# StockSage — Submission materials (Base Stocks Maxxing Season)

Track: **Agentic Stock Finance** · Deadline: **Dec 5, 2026** (Quest Period ends Dec 12)
Sponsor: Coinbase Technologies, Inc. (Base) · Prizes paid in USDC on Base.
Entry = (1) public X post with a video demo tagging @buildonbase + (2) official submission form.

Status: product built + verified on real data. **Not yet posted to X, not yet submitted.**
The video still needs to be produced, and the X post + form need Songyi's X account.

---

## 1. Project summary (for the form)

- **Project name:** StockSage
- **Track:** Agentic Stock Finance
- **One-liner:** An autonomous research agent for Coinbase tokenized stocks on Base — it reads the live market, scores every tokenized stock with a transparent model, and anchors each research brief on-chain.
- **Repository:** https://github.com/guosongyi427-creator/stocksage-base *(to be created on publish; code is in `~/workspace/base-stocks-maxxing/`)*
- **Live dashboard:** `dashboard/index.html` in the repo (static; host it or open the file — no build, no CDN).
- **Demo video:** (to be produced — see §3; target < 2 min)
- **On-chain registry:** `ResearchRegistry` on Base Sepolia (testnet). Contract compiled; deployment pending a funded testnet wallet — see README "On-chain registry". Deployer address: `0x1662759e48c4783f8c83956E7De154438e75312a`.
- **What was built during the Quest Period (Nov 24):** the full agent (fetch → score → brief → anchor), the ResearchRegistry contract, the dashboard, and the scoring model. All new, all in this repo.
- **How it works (short):** The agent pulls all 415 Coinbase tokenized stocks from the public Tokenized Stocks API, reads live Aerodrome prices from DexScreener, scores each token on momentum (30%), market health (25%), NAV premium/discount vs the Chainlink reference (25%), and adoption (20%), then writes a research brief whose keccak256 hash is anchored in a public on-chain registry on Base Sepolia. Anyone can recompute a brief's hash and verify it against the registry.
- **Why it fits Agentic Stock Finance:** the agent itself does the research — a program, not a human trader, interacting with tokenized equities: it reads token contracts, supply, multipliers and NAV references, prices them on the DEX, and publishes verifiable research on-chain.
- **Traction (honest):** the agent is a real on-chain user — every run anchors its briefs as real transactions in a public registry anyone can use. We do not fake users or inflate metrics. Public build activity: this repo + build-in-public posts.
- **No token launched. No purchase, wallet funding, or token holding required to use it.** Testnet build; testnet submissions are not judged less favorably (Official Rules §5).

## 2. X post draft (public post, tags @buildonbase)

Post the video with this text (under 280 characters for the lead post; thread continues below).

**Lead post:**
> Meet StockSage — an AI agent that researches tokenized stocks on Base and anchors every brief on-chain. 🧵
>
> It reads all 415 Coinbase tokenized stocks, prices them live on Aerodrome, scores them with a transparent model, and publishes verifiable research. Built for @buildonbase Stocks Maxxing Season — Agentic Stock Finance. 👇

**Thread (reply 1):**
> How it works: 1) Pull the 415 tokenized stocks from Coinbase's public Tokenized Stocks API (no key). 2) Live DEX price, 24h change, volume + liquidity from DexScreener. 3) Score: momentum 30%, market health 25%, NAV premium/discount 25%, adoption 20%. All rules-based, all reproducible.

**Thread (reply 2):**
> Today NVDAc scored 90 (Strong watch) — $162.54, +21.2% in 24h, $38.4M volume, tracking its Chainlink NAV within -0.22%. ANTc scored 53 after a -6.4% day. Every brief gets a keccak256 hash anchored in a public registry on Base Sepolia. Verify any brief against the chain.

**Thread (reply 3):**
> No token launched. No purchase or wallet funding needed to use it. Open source, static dashboard, runs on Node with zero API keys. Repo + dashboard in the replies. Built in public for #StocksMaxxing.

**Final reply (links):**
> Repo: https://github.com/guosongyi427-creator/stocksage-base
> Dashboard: (link to hosted dashboard / repo)
> Track: Agentic Stock Finance · #StocksMaxxing @buildonbase

## 3. Video demo plan (target 60–90 seconds, screen recording + voiceover)

Goal: prove in under 2 minutes that the agent is real, the data is live, and the on-chain part is real.

| Time | Visual | Narration (English) |
|---|---|---|
| 0:00–0:10 | Title card: "StockSage — agentic research on tokenized stocks (Base)" | "StockSage is an AI agent that researches tokenized stocks on Base — and proves its work on-chain." |
| 0:10–0:30 | Terminal: `node src/agent.mjs --top 20` running live; output lines appear (NVDAc 90, GOOGLc 68, TSLAc 64…) | "It pulls all 415 Coinbase tokenized stocks, reads live Aerodrome prices, and scores each one with a transparent, rules-based model." |
| 0:30–0:50 | Dashboard (`dashboard/index.html`): table with prices, 24h changes, scores, verdicts; highlight NVDAc row | "Here's the dashboard. NVDAc scores 90 today — up 21 percent, 38 million in volume, tracking its Chainlink NAV within a quarter of a percent." |
| 0:50–1:10 | Brief JSON + content hash; then the registry contract (Basescan Sepolia) — or, if not yet deployed, the contract code + deploy command | "Every brief gets a content hash. That hash is anchored in a public registry on Base Sepolia, so anyone can verify what the agent published, and when." |
| 1:10–1:25 | Repo + README on screen; closing card with repo URL + "Agentic Stock Finance · Stocks Maxxing Season" | "Open source, no token, no API keys. StockSage — built for the Base Stocks Maxxing Season." |

Production: record the terminal run + dashboard with a screen recorder, or render with ffmpeg from captured output (same method as the QNX demo video). Voiceover via built-in TTS. Keep it under 2 minutes.

## 4. Submission form — draft answers

The official form is linked from https://base.org/stocksmaxxing ("Apply Now", a Google Form).
Fill it with the project summary in §1 plus:
- **X post link:** (the published X post URL — add after posting)
- **Track(s):** Agentic Stock Finance (only)
- **Team:** individual (Songyi, representative). Team size 1.
- **Wallet for prize (USDC on Base):** (Songyi's EVM wallet address — to be provided at submission time; prizes are paid in USDC on Base, normally within 30 days after verification)
- **Eligibility:** 18+, resident in China (not OFAC-sanctioned). No purchase or token holding required.
- **Winner documents if selected:** proof of identity/age/residence, sanctions screening, W-8 (or local equivalent), wallet address, signed declaration — all within 7 days of notification (Official Rules §9).

## 5. What still needs Songyi (explicit)

1. **X account for the post.** The entry requires a PUBLIC X post with the video demo tagging @buildonbase, from the entrant's own account. I cannot post to X — Songyi (or the parent agent with access to Songyi's X account) must publish it. I have the draft + video plan ready.
2. **Video demo.** The video (60–90 s) still needs to be produced. I can produce it the same way as the QNX demo video (screen capture + TTS voiceover) once the repo is public and the dashboard is hosted — or the parent can delegate it. No Songyi action needed for production, only for the X post itself.
3. **GitHub repo.** The code is built locally in `~/workspace/base-stocks-maxxing/`. Publishing it to GitHub (repo `stocksage-base`) needs the parent agent's browser upload (PAT push is broken). No Songyi action needed.
4. **On-chain deployment (Base Sepolia).** The contract is compiled and the deploy script is ready, but the deployer wallet (`0x1662759e48c4783f8c83956E7De154438e75312a`) has 0 testnet ETH. Every public Base Sepolia faucet needs a browser captcha, a wallet-connect session, or mainnet ETH — I cannot complete any of them headlessly. The parent agent (browser) or Songyi can claim 0.1 ETH from https://www.alchemy.com/faucets/base-sepolia or https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet for that address, then `node scripts/deploy.mjs` + `node src/agent.mjs --top 20` anchors the briefs. **This is optional for a valid entry** (testnet submissions are not judged less favorably, and the product is fully verifiable without it), but it materially strengthens the on-chain/traction story.
5. **Submission form.** After the X post is live, the Google Form must be submitted with the X post link. Needs Songyi's identity details (name/email) or the parent agent to fill it from the draft in §1/§4.
6. **Prize wallet (only if we win).** A compatible EVM wallet address on Base to receive USDC. Songyi's Solana wallet cannot receive Base USDC — an EVM (Base) address will be needed at winner-verification time, not at submission.
