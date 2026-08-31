# Kraskus BSV Solo

Initial 5tratumOS application scaffold for a Bitcoin SV solo-mining appliance.

## Planned runtime

- Upstream node: Bitcoin SV SV Node
- Initial qualification target: 1.2.2
- RPC: internal-only mainnet JSON-RPC on 8332
- P2P: 8333
- Miner Stratum: 3337
- Preferred mining work API: `getminingcandidate`
- Preferred block submission API: `submitminingsolution`
- Compatibility fallback: `getblocktemplate` / `submitblock`

## Kraskus application surface

The BSV application will retain the standardized Kraskus Solo shell: Command/Dashboard, Mining, Wallet, Blocks, Events, and Settings. Settings include difficulty controls, theme selection, payout configuration, optional native wallet mode, and storage-target management.

## Storage safety

SV Node requires substantially more storage than the lightweight coin nodes. Initial installation must not start blockchain synchronization until the selected storage target passes the app's capacity guard. The official BSV quick-start currently estimates approximately 500 GB for a pruned node.

## Security

RPC credentials are generated at install time and are never committed. RPC remains reachable only by app-internal services. The public app surface is routed through 5tratumOS `app_proxy`; only the BSV P2P port and Kraskus Stratum port should be exposed when required.

## Developer fee

Target Kraskus developer fee: 1%. The fee belongs in the mining/payout framework rather than modifying or patching SV Node consensus behavior.

## Bootstrap status

This directory remains `proposed` until the node image is pinned to an immutable digest, BSV-specific Divinity artwork is added, the controller/Stratum runtime is packaged, storage guards are tested, and install/start/restart/update/uninstall qualification passes.
