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


## 0.1.4-beta

- Updates the restricted miner gateway to 0.1.1-beta with blocked POST endpoint audit events.
- Updates the wallet API to 0.1.1-beta with safe restore-height handling, legacy wallet migration, sync-wait gating, and autonomous refresh suppression while the local node is behind.
- Updates the UI to 0.1.2-beta with the finalized Divinity XMR hero, branded sidebar application icon, branded wallet receive waiting state, and explicit sync-locked send presentation.
- Adds the permanent XMR runtime qualification workflow for miner allowlists, blocked-request accounting, event auditing, mainnet identity, monerod availability, and wallet sync gating.
- Keeps monerod and adapter images unchanged.
- Full-sync mining and wallet-send qualification remain required before GA.


## 0.1.5-beta

- Updates the UI to 0.1.3-beta with a full responsive/mobile compatibility pass.
- Adds compact horizontal mobile navigation and phone/tablet-safe card stacking across all six tabs.
- Converts the Blocks submission history into a mobile-friendly record-card layout at phone widths.
- Makes wallet receive/send, settings controls, metrics, and long values responsive and touch-friendly.
- Preserves the 0.1.4-beta miner-gateway and wallet-API hardening unchanged.


## 0.1.6-beta

- Promotes the qualified immutable XMR runtime image set.
- Pins monerod, adapter, miner gateway, wallet API, and UI by exact GHCR digests.
- Adds persistent last-known-good node telemetry during temporary daemon RPC failures.
- Adds protected appliance-local spend credential storage for automatic developer-fee settlement.
- Full-wallet create and restore flows save the wallet password into a mode-0600 local credential used only for automatic fee settlement.
- Watch-only wallets remain monitoring-only.
- Kraskus XMR Solo charges a 0.25% developer fee only on successfully mined block rewards.
- Developer-fee settlement is automatic after reward maturity and does not divert miner hashrate.


## 0.1.7-beta

- Updates the XMR UI to the wallet-setup control fix from source commit `f69435d4898cfabab4d6e3948f78eef524715fda`.
- Clarifies Create New Wallet, Restore Existing Wallet, and Watch-Only as setup-method tabs rather than duplicate action buttons.
- Selecting a setup method now switches to the corresponding panel, updates accessibility state, and focuses the first relevant field.
- The lower form action remains the control that actually creates, restores, or configures the wallet.
- Keeps monerod, adapter, miner gateway, wallet API, automatic developer-fee settlement, and persistent storage behavior unchanged from 0.1.6-beta.


## 0.1.8-beta

- Updates only the XMR UI image from source commit `709e92f478ff1981053bd29e4b478e58562b68f0`.
- Corrects the sidebar footer and version service card so they display `v0.1.8-beta` instead of the stale `v0.1.1-beta` label.
- Keeps wallet setup, wallet/API, daemon, miner gateway, automatic developer-fee settlement, storage, and networking behavior unchanged from 0.1.7-beta.


## 0.1.9-beta

- Promotes the five images produced by canonical GitHub Actions build run `33825587530`, pinned by exact GHCR digests.
- Records canonical build source `9b371e3ba75f758098d9b1d63445ba37e8577eb7` and release metadata commit `46076d46195ed346c990d0fa336e8227e97f7b95`.
- Keeps the automatic developer fee at exactly 1% of successfully mined block rewards after 60-block maturity.
- Removes mining and wallet-send lockouts while automatic fee settlement is pending or temporarily failing.
- Preserves ledger integrity, orphan handling, retry, prepared-transaction recovery, fixed fee destination/rate/amount validation, and double-payment prevention.
- Remains a Dev Store candidate pending client-style VM100 qualification before any Official Store promotion.
