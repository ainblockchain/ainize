# ENSv2 Sepolia — deployment and permission evidence

Recorded status: **complete**. Chain ID: **11155111**.
Knowledge name: **patch.ainize-4782c76e.eth**.
Resolved through the pinned ENSv2 deployment: **verified**.
This is distinct from the canonical Universal Resolver proxy. Its root can lag a newer beta deployment; canonical CLI resolution is recorded separately.

**Canonical resolution verified at block 11696557**: all eight records resolve through default viem on Sepolia, without a resolver address override.
[Canonical receipts and record checks](canonical.json) · [Actual CLI output](cli-resolution.json).
The first registration used the newer pinned beta root. Five additional confirmed transactions link the same namespace to the root currently used by the canonical proxy; both histories are preserved below.

These are real confirmed Sepolia transactions. The receipt JSON includes block hashes, event logs, gas used, and transaction fees.
[Full machine-readable evidence](deployment.json). [Independent live receipt recheck](receipt-recheck.json) compares successful status, block hash and gas used against the public RPC.

## Deployed contracts

- registry: [0xD8945635527216AB26b687EB66F6e8B07920c6cc](https://sepolia.etherscan.io/address/0xD8945635527216AB26b687EB66F6e8B07920c6cc)
- resolver: [0xa0A7f54128b3fC4D1A9003A8d81c9759a2018d57](https://sepolia.etherscan.io/address/0xa0A7f54128b3fC4D1A9003A8d81c9759a2018d57)
- engramRegistrar: [0x918eEa9C9cb2770DC3cE81A1BEb4990cd665131A](https://sepolia.etherscan.io/address/0x918eEa9C9cb2770DC3cE81A1BEb4990cd665131A)

## Transactions

| Operation | Block | Transaction | Gas used |
| --- | --- | --- | ---: |
| deploy-registry | [11696491](https://sepolia.etherscan.io/block/11696491) | [0xb7b3d5b3e0…](https://sepolia.etherscan.io/tx/0xb7b3d5b3e0b3676bca0c04db4d563d3c7c87b283191c45bce622d26db8dbabeb) | 176205 |
| deploy-resolver | [11696492](https://sepolia.etherscan.io/block/11696492) | [0xd277e4ed75…](https://sepolia.etherscan.io/tx/0xd277e4ed7528947abf8fc830b58f196a8708f29ae3d23874d50fb917720e4404) | 176373 |
| deploy-engram-registrar | [11696493](https://sepolia.etherscan.io/block/11696493) | [0x4d4647a4db…](https://sepolia.etherscan.io/tx/0x4d4647a4dbe55a4845d1fb54954e4228cdd83c5fe9cc498a6013e28ada41c972) | 931980 |
| grant-registrar-role | [11696495](https://sepolia.etherscan.io/block/11696495) | [0x39bc2bb777…](https://sepolia.etherscan.io/tx/0x39bc2bb777bfc8aed99c43f77b062646a0657234ab704eead10504e09ade62ad) | 63244 |
| commit-root | [11696496](https://sepolia.etherscan.io/block/11696496) | [0xd7af05e1df…](https://sepolia.etherscan.io/tx/0xd7af05e1df66ac61e0d859e2162cb4b14dd1d16b74ee5031bf3d60bd635887ab) | 45438 |
| mint-mock-usdc | [11696504](https://sepolia.etherscan.io/block/11696504) | [0x5d0f2921f9…](https://sepolia.etherscan.io/tx/0x5d0f2921f9af92a213ae685b75ea2b39a0e9e206f40a2cd5f549d632e861f9c5) | 51369 |
| approve-mock-usdc | [11696505](https://sepolia.etherscan.io/block/11696505) | [0x4013ac5b58…](https://sepolia.etherscan.io/tx/0x4013ac5b58018f960360a8243220ac150577d60fc378b0faf8d34d76b92b6fa3) | 46354 |
| register-root | [11696507](https://sepolia.etherscan.io/block/11696507) | [0x0012244058…](https://sepolia.etherscan.io/tx/0x0012244058c83f916fb15f983ef6055683c0f850af340cda84fe2dc41f5ac067) | 235237 |
| set-registry-parent | [11696508](https://sepolia.etherscan.io/block/11696508) | [0xc4f299e403…](https://sepolia.etherscan.io/tx/0xc4f299e4033083d0440221c313b7dc80a970b01bb7b2fd2a994ca93bc9ca6d6f) | 80888 |
| operator-register-child | [11696510](https://sepolia.etherscan.io/block/11696510) | [0xd2eb6e4687…](https://sepolia.etherscan.io/tx/0xd2eb6e468702ab8936e4535c158706d147f86a23d3d37220e366d4940cf21878) | 170147 |
| authorize-and-write-records | [11696511](https://sepolia.etherscan.io/block/11696511) | [0xaac65dd5fb…](https://sepolia.etherscan.io/tx/0xaac65dd5fb8ea2e12403a5e6e0e93345ec5a5af16568de58ea0a4074e8fbe7ed) | 1068392 |
| revoke-patch-write | [11696513](https://sepolia.etherscan.io/block/11696513) | [0xe3172e1c92…](https://sepolia.etherscan.io/tx/0xe3172e1c926194b8088d0d2fbb36f4a1006cb946b6147e1ca5dac48bed83e4e2) | 42468 |
| commit-canonical-root | [11696540](https://sepolia.etherscan.io/block/11696540) | [0xe3fe698e54…](https://sepolia.etherscan.io/tx/0xe3fe698e54117f1ab579767c58addbfe260036064f76958978bb2ef9a5823d62) | 45433 |
| mint-canonical-mock-usdc | [11696547](https://sepolia.etherscan.io/block/11696547) | [0x6f5e01b33f…](https://sepolia.etherscan.io/tx/0x6f5e01b33fe3236cb7716e1918b7cad69bc8be4648715730f1009f5dca482bfc) | 51368 |
| approve-canonical-mock-usdc | [11696549](https://sepolia.etherscan.io/block/11696549) | [0x38f59f38d3…](https://sepolia.etherscan.io/tx/0x38f59f38d38f3e5edd543a77f40610d03d26b2483f9922cdd5ae31ce433c406f) | 46353 |
| register-canonical-root | [11696550](https://sepolia.etherscan.io/block/11696550) | [0x6af652f28f…](https://sepolia.etherscan.io/tx/0x6af652f28f6138d21a0fcd7ac56a39f66a42c0c240828800f58327651dcd8419) | 235256 |
| set-canonical-parent | [11696552](https://sepolia.etherscan.io/block/11696552) | [0x824e56a941…](https://sepolia.etherscan.io/tx/0x824e56a94154e128c77a848848a97c02d21ff17c9ac4816043b15dadece7b7f9) | 43888 |

## Record and permission checks

At block **11696513**, the same account can write `ainize.node` but a write to `ainize.patch` reverts with `EACUnauthorizedAccountRoles`. These permission probes are eth_call simulations after real grants/revocations; they do not create extra transactions.

```json
{
  "ainize.node": "https://www.ainize.ai",
  "ainize.patch": "taught-ainize-lifecycle100-2026-cf9a6f",
  "ainize.patch.sha256": "fb1cd41e2f6a26f785d72460a2eac4a62688ee4c70e5bee43187d734eeca2e64",
  "ainize.patch.status": "REJECTED",
  "ainize.provenance": "Existing Ainize catalogue patch; catalogue status REJECTED; operator registration only; no EngramRegistrar training mint; no Graph-trained model claim.",
  "ainize.dataset": "97a216a3-1692-4ebd-a148-928b5b3dfa9e",
  "ainize.dataset.sha256": "edc53e171486aced6e10c8f6647db0c311b51a96b9d48160a5f3f15da8762b53",
  "ainize.graph.block": "25969047"
}
```

## Scope

The name points to an existing catalogue patch and, when supplied, the new Graph dataset provenance. The catalogue status is preserved; registration does not turn a REJECTED patch into verified knowledge.
The EngramRegistrar contract is deployed and authorized, but no training mint or new independent GPU-verifier attestation is claimed. Dataset upload is not model training.
Resolver roles control record writes, not confidentiality of on-chain data or access to a model file. The owner retains explicit administration rights.
