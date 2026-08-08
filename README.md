# Kraskus App Store for 5tratumOS

A custom 5tratStore repository maintained by Kraskus.

## Add to 5tratumOS

After publishing this repository to GitHub, use the **App Store → Add custom store**
control and enter the GitHub repository URL.

## Current apps

### Mysterium Node

Runs the official Mysterium node container and provides a 5tratumOS onboarding page.

New MystNodes users are directed through this disclosed Kraskus referral URL:

`https://mystnodes.co/?referral_code=CJSoelVnKkllilXIgv7JqeroUv1jhnZ4KWE4G6E4`

Existing MystNodes users can skip new-account signup and connect their own API key.

## Repository layout

```text
Kraskus-5tratStore/
├── umbrel-app-store.yml
├── README.md
├── mysterium-node/
│   ├── 5tratstore-app.yml
│   ├── 5tratstore-review.yml
│   ├── LICENSES.md
│   ├── docker-compose.yml
│   └── data/
│       └── portal/
│           └── index.html
└── scripts/
    └── pin-images.sh
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
