# Kraskus App Store for 5tratumOS

A custom 5tratStore repository maintained by Kraskus.

## Quick compatibility setup

Some current 5tratumOS installations expose dynamically named custom stores in the WebUI but still use an older CLI for app lifecycle commands. On affected hosts, native custom-store app updates can fail before Docker is touched.

Before adding the Kraskus store, open the 5tratumOS terminal and run this one command:

```bash
curl -fsSL https://raw.githubusercontent.com/kraskuscrypto/Kraskus-5tratStore/main/scripts/install-kraskus-compat.sh | sudo bash
```

The setup only patches the known affected CLI layout. Newer compatible systems and systems already repaired are left untouched; unknown CLI layouts are refused safely.

See `COMPATIBILITY-SETUP.md` for details and recovery behavior.

## Add to 5tratumOS

Use **App Store → Add custom store** and enter:

```text
https://github.com/kraskuscrypto/Kraskus-5tratStore
```

Then install and update Kraskus apps normally from the native 5tratumOS App Store.

## Current apps

### Kraskus ZEC Solo

Runs a Zebra-backed Zcash full node and local solo-mining service with a Kraskus-branded interface. Normal users configure their payout address and miner connection without managing Zebra, RPC, Docker, Linux, JSON, or Stratum internals.

### MystNodes by Kraskus

Runs the official Mysterium node container with a MystNodes-style 5tratumOS launcher.

New MystNodes users are directed through this disclosed Kraskus referral URL:

`https://mystnodes.co/?referral_code=CJSoelVnKkllilXIgv7JqeroUv1jhnZ4KWE4G6E4`

Existing MystNodes users can skip new-account signup and connect their own API key.

## Repository layout

```text
Kraskus-5tratStore/
├── COMPATIBILITY-SETUP.md
├── umbrel-app-store.yml
├── README.md
├── kraskus-zec-solo/
├── mysterium-node/
└── scripts/
    ├── install-kraskus-compat.sh
    ├── fix-5tratumos-dynamic-custom-channels.sh
    ├── new-app.sh
    ├── pin-images.sh
    ├── validate-compose.sh
    └── validate_store.py
```

## Before publishing

Run `scripts/pin-images.sh` on a Docker host. It resolves immutable RepoDigests
for the official Mysterium and nginx images and writes them into
`mysterium-node/docker-compose.yml`.

Do not publish a recipe containing `__MYST_IMAGE__` or `__PORTAL_IMAGE__`.

---

## Kraskus Reference App SDK

This store includes a small local SDK for creating consistent 5tratStore apps.

Create a new application skeleton:

```bash
scripts/new-app.sh my-app
```

Validate the entire store:

```bash
python3 scripts/validate_store.py
```

Validate a single app's Docker Compose recipe:

```bash
scripts/validate-compose.sh mysterium-node
```

See `REFERENCE-APP-STANDARD.md` for the packaging, security, provenance, and
onboarding standard used by Kraskus apps.
