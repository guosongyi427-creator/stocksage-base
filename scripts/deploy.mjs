// Deploy ResearchRegistry to Base Sepolia testnet.
//   node scripts/deploy.mjs
// Requires .env with DEPLOYER_PRIVATE_KEY and a funded wallet (Base Sepolia ETH
// from a faucet, e.g. https://www.alchemy.com/faucets/base-sepolia or
// https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).
// Writes the deployed address to .env (REGISTRY_ADDRESS) and deployments/base-sepolia.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
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

const env = loadEnv();
if (!env.DEPLOYER_PRIVATE_KEY) {
  console.error("ERROR: DEPLOYER_PRIVATE_KEY not set in .env");
  process.exit(1);
}
const account = privateKeyToAccount(env.DEPLOYER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });

const bal = await publicClient.getBalance({ address: account.address });
console.log("deployer:", account.address);
console.log("balance:", formatEther(bal), "Base Sepolia ETH");
if (bal === 0n) {
  console.error("ERROR: deployer has 0 Base Sepolia ETH. Claim testnet ETH from a faucet first:");
  console.error("  - https://www.alchemy.com/faucets/base-sepolia (0.1 ETH/day)");
  console.error("  - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet");
  console.error("Then re-run: node scripts/deploy.mjs");
  process.exit(1);
}

console.log("deploying ResearchRegistry ...");
const hash = await walletClient.deployContract({
  abi: registryArtifact.abi,
  bytecode: registryArtifact.bytecode,
});
console.log("deploy tx:", hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const address = receipt.contractAddress;
console.log("deployed at:", address);
console.log("block:", Number(receipt.blockNumber), "| gas used:", receipt.gasUsed.toString());

// verify: read briefCount (expect 0)
const count = await publicClient.readContract({
  address, abi: registryArtifact.abi, functionName: "briefCount",
});
console.log("briefCount() =", Number(count), "(expected 0)");

// persist
mkdirSync(new URL("../deployments", import.meta.url), { recursive: true });
writeFileSync(new URL("../deployments/base-sepolia.json", import.meta.url), JSON.stringify({
  network: "base-sepolia", chainId: 84532, contract: "ResearchRegistry",
  address, deployTx: hash, deployer: account.address,
  deployedAt: new Date().toISOString(),
  basescan: `https://sepolia.basescan.org/address/${address}`,
}, null, 2));
// append REGISTRY_ADDRESS to .env
let envText = readFileSync(new URL("../.env", import.meta.url), "utf8");
if (/^REGISTRY_ADDRESS=/m.test(envText)) envText = envText.replace(/^REGISTRY_ADDRESS=.*$/m, `REGISTRY_ADDRESS=${address}`);
else envText += `REGISTRY_ADDRESS=${address}\n`;
writeFileSync(new URL("../.env", import.meta.url), envText);
console.log("saved REGISTRY_ADDRESS to .env and deployments/base-sepolia.json");
console.log("Next: run the agent to anchor briefs: node src/agent.mjs --top 20");
