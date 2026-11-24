// On-chain anchoring for StockSage (Base Sepolia testnet).
// Reads .env for REGISTRY_ADDRESS and DEPLOYER_PRIVATE_KEY.
// If either is missing, anchoring is skipped cleanly and the brief is recorded
// as "pending" together with its content hash, so it can be anchored later
// with the exact same hash (the hash never changes for a given brief).
import { readFileSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import registryArtifact from "../contracts/ResearchRegistry.json" with { type: "json" };

const RPC = "https://sepolia.base.org";

function loadEnv() {
  const env = {};
  if (existsSync(new URL("../.env", import.meta.url))) {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z_]+)=(.*)\s*$/);
      if (m) env[m[1]] = m[2].trim();
    }
  }
  return env;
}

export function anchorConfig() {
  const env = loadEnv();
  return {
    registryAddress: env.REGISTRY_ADDRESS || null,
    privateKey: env.DEPLOYER_PRIVATE_KEY || null,
    deployerAddress: env.DEPLOYER_ADDRESS || null,
  };
}

export async function getBalance(address) {
  const c = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  return c.getBalance({ address });
}

/**
 * Anchor one brief on-chain. Returns { status, txHash?, blockNumber?, error? }.
 * status: "anchored" | "skipped" | "failed".
 */
export async function anchorBrief(brief) {
  const { registryAddress, privateKey } = anchorConfig();
  if (!registryAddress) return { status: "skipped", reason: "no REGISTRY_ADDRESS in .env (contract not deployed yet)" };
  if (!privateKey) return { status: "skipped", reason: "no DEPLOYER_PRIVATE_KEY in .env" };
  try {
    const account = privateKeyToAccount(privateKey);
    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
    const bal = await publicClient.getBalance({ address: account.address });
    if (bal === 0n) return { status: "skipped", reason: `deployer ${account.address} has 0 Base Sepolia ETH (needs faucet funds)` };
    // skip if this exact hash is already anchored (idempotent)
    const already = await publicClient.readContract({
      address: registryAddress,
      abi: registryArtifact.abi,
      functionName: "anchored",
      args: [brief.contentHash],
    });
    if (already) return { status: "skipped", reason: "content hash already anchored on-chain" };
    const hash = await walletClient.writeContract({
      address: registryAddress,
      abi: registryArtifact.abi,
      functionName: "anchorBrief",
      args: [brief.contentHash, brief.symbol, brief.score],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    return { status: "anchored", txHash: hash, blockNumber: Number(receipt.blockNumber), gasUsed: receipt.gasUsed.toString() };
  } catch (e) {
    return { status: "failed", error: String(e?.message || e).slice(0, 300) };
  }
}

/** Read how many briefs the registry holds (public, no wallet needed). */
export async function registryCount(registryAddress) {
  const c = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
  return Number(await c.readContract({
    address: registryAddress, abi: registryArtifact.abi, functionName: "briefCount",
  }));
}

export { formatEther };
