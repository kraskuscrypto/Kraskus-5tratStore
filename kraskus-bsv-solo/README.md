# Kraskus BSV Solo

Initial 5tratumOS application scaffold for a Bitcoin SV solo-mining appliance.

## Planned runtime

- Upstream node: Bitcoin SV SV Node
- Initial qualification target: 1.2.2
- RPC: internal-only mainnet JSON-RPC on 8332
- P2P: 8333
- Miner Stratum: 1922
- Preferred mining work API: `getminingcandidate`
- Preferred block submission API: `submitminingsolution`
- Compatibility fallback: `getblocktemplate` / `submitblock`

## Kraskus application surface

The BSV application will retain the standardized Kraskus Solo shell: Command/Dashboard, Mining, Wallet, Blocks, Events, and Settings. Settings include difficulty controls, theme selection, payout configuration, optional native wallet mode, and storage-target management.

## Storage safety

Kraskus BSV Solo defaults to a pruned SV Node suitable for mining rather than an archival node.

- Default SV Node setting: `prune=100000`
- The setting is a pruning target in MiB, not a guaranteed hard disk cap.
- Kraskus default pre-sync storage guard: 160 GiB free.
- Initial sync may temporarily exceed the configured pruning target while blocks are downloaded and validated.
- Archive/unpruned operation is not the default and should only be enabled on storage explicitly sized for it.

The official SV Node configuration documentation notes that the currently achievable mainnet pruning target is approximately 100 GB and shows `prune=100000` as a mining-node example. The app must continue to surface free-space telemetry during initial sync rather than assuming the prune target is an absolute maximum.

## Security

RPC credentials are generated at install time and are never committed. RPC remains reachable only by app-internal services. The public app surface is routed through 5tratumOS `app_proxy`; only the BSV P2P port and Kraskus Stratum port should be exposed when required.

## Developer fee

Target Kraskus developer fee: 1%. The fee belongs in the mining/payout framework rather than modifying or patching SV Node consensus behavior.

## Bootstrap status

This directory remains `proposed` until the node image is pinned to an immutable digest, BSV-specific Divinity artwork is added, the controller/Stratum runtime is packaged, pruned storage guards are qualified, and install/start/restart/update/uninstall qualification passes.
