// Compile contracts/ResearchRegistry.sol with solc-js and write the artifact
// (ABI + bytecode) to contracts/ResearchRegistry.json. Run: node scripts/compile.mjs
import { readFileSync, writeFileSync } from "node:fs";
import solc from "solc";

const source = readFileSync(new URL("../contracts/ResearchRegistry.sol", import.meta.url), "utf8");
const input = {
  language: "Solidity",
  sources: { "ResearchRegistry.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors) {
  for (const e of output.errors) {
    console.log(e.severity + ": " + e.formattedMessage);
    if (e.severity === "error") process.exit(1);
  }
}
const contract = output.contracts["ResearchRegistry.sol"]["ResearchRegistry"];
const artifact = {
  contractName: "ResearchRegistry",
  abi: contract.abi,
  bytecode: "0x" + contract.evm.bytecode.object,
};
writeFileSync(new URL("../contracts/ResearchRegistry.json", import.meta.url), JSON.stringify(artifact, null, 2));
console.log("compiled OK. bytecode bytes:", (artifact.bytecode.length - 2) / 2);
console.log("abi entries:", artifact.abi.length);
