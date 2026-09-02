# Kraskus Release Pipeline V1

## Purpose

Kraskus application development, testing, and client delivery are separated so development work cannot silently become an official release.

## Repository roles

- Kraskus-Mining-Platform-V2: protected pool/platform project. Not part of the app release pipeline.
- Kraskus-Crypto-Apps: canonical private source repository for coin applications, shared components, and the Kraskus UI template.
- Kraskus-Crypto-Dev-Store: development Store for alpha, beta, release-candidate, UI-preview, and qualification builds.
- Kraskus-Crypto-Store: official client-facing Store. Production manifests only.

## Branch model

Canonical long-lived references:

- main: Store integration baseline.
- ui/main: current installable shared UI reference.
- coin/<symbol>: current known-good development Store baseline for each coin.

Short-lived work:

- feature/<scope>-<change>
- fix/<scope>-<issue>
- rc/<coin>-<version>
- hotfix/<coin>-<issue>

## Source authority

Application and UI source belongs in Kraskus-Crypto-Apps. Store repositories contain release manifests, icons, metadata, and references to immutable published artifacts. The Store is not the primary coding workspace.

## Immutable artifacts

Official and qualified releases must reference immutable image digests. Mutable tags such as latest must not be the release authority. Promotion from Dev Store to Official Store must reference the exact digest that passed qualification; production promotion must not rebuild the image.

## Required release manifest

Each coin release must record at minimum:

- app id and coin symbol
- app version and release channel
- source repository and commit SHA
- UI/template version
- Docker image names and immutable digests
- upstream node/wallet versions
- required ports
- persistent data schema/migration version
- supported 5tratumOS version/range
- wallet mode and backup/restore support status
- qualification date and qualification result

## Promotion gate

A release may move to the Official Store only after the same immutable artifacts pass the applicable checks:

1. Store manifest validation.
2. Clean install on a client-equivalent VM.
3. First start and service health.
4. Node startup and sync-progress verification.
5. Miner connection and accepted-work path where applicable.
6. UI/API smoke test and required-tab contract.
7. Mobile/responsive smoke test.
8. Restart/reboot recovery.
9. In-place update from the previous supported release.
10. Keep Data uninstall/reinstall.
11. Purge uninstall and clean reinstall.
12. Wallet create/use flow where supported.
13. Backup and real disposable restore qualification where supported.
14. No committed or logged secrets.
15. No hard-coded development host/IP dependencies.
16. Exact image digest verification.
17. Rollback path identified and previous known-good release retained.

A failed client-equivalent VM test is a release failure. Do not hand-patch the client-equivalent VM to make a candidate pass.

## Client-equivalent test appliance

The clean qualification VM must contain only stock 5tratumOS and state delivered through the selected Store/app lifecycle. No source repositories, local Docker builds, copied blockchain state, machine-specific fixes, or manual file surgery may be required for a passing release.

## Compatibility

Maintain a compatibility record for each release covering 5tratumOS, upstream node/wallet software, data migrations, and template version. Breaking compatibility requires explicit release notes and migration/rollback handling.

## Security and secrets

Never commit or expose wallet seeds, private keys, recovery phrases, RPC passwords, cookies, encryption identities, API credentials, or equivalent sensitive material. CI and release qualification should reject known secret patterns and should avoid printing sensitive runtime files.

## Wallet qualification

A backup feature is not considered restore-capable until a disposable create -> backup -> destroy -> restore -> verify test has passed without exposing recovery material in logs or test output.

## Rollback and retention

Keep prior known-good official releases and all image digests referenced by official manifests. Never depend on rebuilding an old release. Dev-only artifacts may be cleaned according to a separate retention policy after they are no longer referenced.

## Release notes and issue classification

Every release receives a concise changelog. Bugs should be classifiable by coin, template/shared UI, Store/installer, wallet, node, or 5tratumOS compatibility so shared fixes can be propagated correctly.

## Deprecation

Archive obsolete branches/releases rather than erasing provenance. Removal from the Official Store requires an explicit deprecation decision and, where relevant, user data migration/backup guidance.

## Legal metadata

Published apps must retain required upstream license notices and attribution, use trademark-safe naming, and include Kraskus release/license metadata appropriate to the distribution model.

## Repository recovery

Critical source, Store metadata, release manifests, and provenance should have periodic independent repository mirrors/backups. GitHub must not be the sole copy of release history.
