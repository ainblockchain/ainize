import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!process.argv[2]) throw new Error('Usage: node submission/export-ens.mjs <public-deployment-evidence.json>');
const evidence = JSON.parse(await readFile(resolve(process.argv[2]), 'utf8'));
if (evidence.preflight?.chainId !== 11155111 || !Array.isArray(evidence.transactions) || !evidence.trainingMint) {
  throw new Error('Expected public Sepolia deployment evidence, not a private deployment journal');
}
const text = JSON.stringify(evidence, null, 2);
if (/"(?:secret|privateKey|private_key|SEPOLIA_PRIVATE_KEY|GRAPH_API_KEY|AINIZE_TEACH_KEY)"\s*:/i.test(text)) {
  throw new Error('Private configuration fields must never be exported');
}
for (const transaction of evidence.transactions) {
  if (!/^0x[0-9a-f]{64}$/i.test(transaction.hash) || transaction.status !== 1 || !Number.isInteger(transaction.blockNumber)) {
    throw new Error('Only confirmed successful transaction receipts belong in this table');
  }
}
const folder = resolve(root, 'evidence/ens');
await mkdir(folder, { recursive: true });
await writeFile(resolve(folder, 'deployment.json'), text + '\n');
const rows = evidence.transactions.map(transaction =>
  `| ${transaction.step} | [${transaction.blockNumber}](https://sepolia.etherscan.io/block/${transaction.blockNumber}) | [${transaction.hash.slice(0, 12)}…](https://sepolia.etherscan.io/tx/${transaction.hash}) | ${transaction.gasUsed} |`);
const addresses = Object.entries(evidence.addresses ?? {}).map(([role, address]) =>
  `- ${role}: [${address}](https://sepolia.etherscan.io/address/${address})`);
const proof = evidence.eac;
const lines = [
  '# ENSv2 Sepolia — deployment and permission evidence', '',
  `Recorded status: **${evidence.status}**. Chain ID: **11155111**.`,
  `Knowledge name: **${evidence.configuration.fullName}**.`,
  `Globally resolved through ENSv2: **${evidence.globalResolutionVerified === true ? 'verified' : 'not yet verified'}**.`, '',
  'These are real confirmed Sepolia transactions. The receipt JSON includes block hashes, event logs, gas used, and transaction fees.',
  '[Full machine-readable evidence](deployment.json).', '',
  '## Deployed contracts', '', ...addresses, '',
  '## Transactions', '', '| Operation | Block | Transaction | Gas used |', '| --- | --- | --- | ---: |', ...rows, '',
  '## Record and permission checks', '',
  proof ? `At block **${proof.block}**, the same account can write \`${proof.allowed.key}\` but a write to \`${proof.refused.key}\` reverts with \`${proof.refused.error}\`. These permission probes are eth_call simulations after real grants/revocations; they do not create extra transactions.` : 'The final per-key permission readback has not completed yet.', '',
  '```json', JSON.stringify(evidence.records ?? {}, null, 2), '```', '',
  '## Scope', '',
  'The name points to an existing catalogue patch and, when supplied, the new Graph dataset provenance. The catalogue status is preserved; registration does not turn a REJECTED patch into verified knowledge.',
  'The EngramRegistrar contract is deployed and authorized, but no training mint or new independent GPU-verifier attestation is claimed. Dataset upload is not model training.',
  'Resolver roles control record writes, not confidentiality of on-chain data or access to a model file. The owner retains explicit administration rights.', '',
];
await writeFile(resolve(folder, 'README.md'), lines.join('\n'));
console.log(JSON.stringify({ status: evidence.status, confirmedTransactions: rows.length, directory: 'evidence/ens', globallyResolved: evidence.globalResolutionVerified === true }));
