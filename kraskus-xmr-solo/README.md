# Kraskus XMR Solo

Native 5tratStore package for the Kraskus XMR true solo appliance.

## Ports

- 33065 — 5tratumOS app proxy entry
- 18080/tcp — Monero P2P
- 1921/tcp — restricted direct-daemon solo miner endpoint

monerod RPC, adapter RPC, wallet RPC, and wallet API are not published to
the host.

## Persistent data

All persistent state lives below `${APP_DATA_DIR}`:

- blockchain/
- wallets/
- runtime/

The package creates a private view-wallet password automatically during
first-run initialization if one does not already exist.

## Artwork

`assets/icon.png` is the approved Divinity XMR application icon from the
Kraskus brand asset vault.


## 0.1.1-beta

- Starts the UI independently so the 5tratumOS app shell opens while backend services initialize.
- Runs the miner gateway as UID/GID 1000:1000 to match persistent runtime storage ownership.
- Preserves blockchain, wallet, and runtime state in `${APP_DATA_DIR}`.


## 0.1.2-beta

- Bundles the Kraskus dynamic custom-channel compatibility bootstrap.
- On the known affected older 5tratumOS CLI, the bootstrap safely enables updates from dynamically named custom stores such as `custom-kraskus-5tratstore`.
- The bootstrap is conservative: it verifies the Kraskus store is configured, patches only the exact known stale channel-validation layout, creates a backup, runs `bash -n`, restores automatically on failure, and no-ops on compatible or unknown layouts.
- No Docker socket or privileged mode is used.


## 0.1.3-beta

- Removes the host-modifying compatibility bootstrap from the XMR package.
- Restores a stock 5tratumOS-compatible install recipe with no host CLI or store-config bind mounts.
- Retains the fast-start UI, gateway UID/GID 1000:1000, persistent APP_DATA_DIR storage, immutable image pinning, and approved Divinity app icon.
- Dynamic custom-store channel compatibility is being fixed at the 5tratumOS platform layer instead of by patching the host from inside the app.
