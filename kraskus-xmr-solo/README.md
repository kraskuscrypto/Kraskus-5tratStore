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
