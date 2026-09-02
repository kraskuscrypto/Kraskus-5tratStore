# Kraskus 5tratumOS Compatibility Setup

Some 5tratumOS installations expose dynamically named custom stores in the WebUI but still use an older CLI that only accepts `custom1` / `custom2` for app lifecycle commands. On those hosts, a native App Store update can fail before Docker is touched.

Kraskus provides a conservative compatibility check and repair for that specific mismatch.

## One-command setup

Open the 5tratumOS terminal and run:

```bash
curl -fsSL https://raw.githubusercontent.com/kraskuscrypto/Kraskus-Crypto-Dev-Store/9fd9dbac10ddd0d6fd2de22ff8adaaadd01e2658/scripts/install-kraskus-compat.sh | sudo bash
```

The customer command is pinned to a tested installer revision. That installer is also pinned to the clean-host-qualified compatibility patcher revision, so future changes to `main` cannot silently alter the repair being executed.

The setup is designed to be safe across known 5tratumOS variants:

- Newer compatible CLI: no changes are made.
- Previously patched CLI: no changes are made.
- Known affected older CLI: a timestamped backup is created, the compatibility repair is applied, and shell syntax is validated.
- Unknown CLI layout: setup refuses to modify the host.

After success, add the store normally from **App Store → Add custom store** using:

```text
https://github.com/kraskuscrypto/Kraskus-Crypto-Dev-Store
```

Then install and update Kraskus apps through the normal 5tratumOS App Store.

## Security design

Kraskus apps remain unprivileged. The mining app does not mount `/usr/local/bin`, does not require the Docker socket, and does not receive host-root access. The compatibility action is intentionally separate and explicit because current 5tratumOS app recipes do not expose a supported host-side install hook.

## Recovery

When a repair is required, the patcher creates a timestamped backup beside `/usr/local/bin/5tratumos` before changing anything. If shell syntax validation fails, the original file is restored automatically.
