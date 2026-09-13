# ENSv2 Sepolia — deployment and permission evidence

Recorded status: **in-progress**. Chain ID: **11155111**.
Knowledge name: **patch.ainize-4782c76e.eth**.
Globally resolved through ENSv2: **not yet verified**.

These are real confirmed Sepolia transactions. The receipt JSON includes block hashes, event logs, gas used, and transaction fees.
[Full machine-readable evidence](deployment.json).

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

## Record and permission checks

The final per-key permission readback has not completed yet.

```json
{}
```

## Scope

The name points to an existing catalogue patch and, when supplied, the new Graph dataset provenance. The catalogue status is preserved; registration does not turn a REJECTED patch into verified knowledge.
The EngramRegistrar contract is deployed and authorized, but no training mint or new independent GPU-verifier attestation is claimed. Dataset upload is not model training.
Resolver roles control record writes, not confidentiality of on-chain data or access to a model file. The owner retains explicit administration rights.
