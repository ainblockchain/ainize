import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { verifyTextPermissions } from '../integrations/ens/scripts/eac-proof.mjs';

const require = createRequire(new URL('../integrations/ens/package.json', import.meta.url));
const { Contract, JsonRpcProvider, VoidSigner, namehash } = require('ethers');
const evidence = JSON.parse(await readFile(new URL('../evidence/ens/deployment.json', import.meta.url), 'utf8'));
const provider = new JsonRpcProvider(process.env.SEPOLIA_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com');
try {
  if ((await provider.getNetwork()).chainId !== 11155111n) throw new Error('Sepolia required');
  const block = await provider.getBlock('latest');
  const owner = evidence.configuration.owner;
  const resolver = new Contract(evidence.addresses.resolver, [
    'function setText(bytes32 node, string key, string value)',
    'error EACUnauthorizedAccountRoles(uint256 resource, uint256 roleBitmap, address account)',
  ], new VoidSigner(owner, provider));
  const refused = await verifyTextPermissions(resolver, namehash(evidence.configuration.fullName), owner,
    evidence.records['ainize.node'], evidence.records['ainize.patch'], block.number);
  console.log(JSON.stringify({ chainId: 11155111, block: block.number, blockHash: block.hash,
    name: evidence.configuration.fullName, resolver: evidence.addresses.resolver,
    account: owner, allowedKey: 'ainize.node', refusedKey: 'ainize.patch',
    refusedError: refused.error, transactionsSent: 0,
    method: 'Fresh eth_call probes against deployed Sepolia permissions, using the public sender address; no signing key used.' }));
} finally { provider.destroy(); }
