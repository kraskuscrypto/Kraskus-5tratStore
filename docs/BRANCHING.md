# Kraskus App and Store Branching

## Long-lived branches

- main: integration baseline for the repository.
- ui/main: approved shared UI reference.
- coin/<symbol>: known-good development baseline for that coin.

Current coin references:

- coin/bsv
- coin/chta
- coin/xmr
- coin/zec

Add future coins only when active work is planned. Use lowercase symbols.

## Short-lived branches

- feature/ui-<change>: shared UI/template work.
- feature/<coin>-<change>: coin-specific feature work.
- fix/<coin>-<issue>: coin-specific corrective work.
- rc/<coin>-<version>: release-candidate qualification.
- hotfix/<coin>-<issue>: urgent release correction.

## Rules

1. Shared UI work starts from ui/main.
2. Coin-specific work starts from coin/<symbol>.
3. Shared fixes are merged into ui/main first, then deliberately propagated to affected coin baselines.
4. Coin-only behavior must not silently mutate the shared UI contract.
5. Release candidates must point at immutable image digests.
6. Official promotion uses the exact qualified digest; do not rebuild on promotion.
7. Long-lived baselines must not be force-pushed or deleted.
8. Archive obsolete historical branches after provenance is verified; do not erase history merely to reduce branch count.
9. Kraskus-Mining-Platform-V2 is outside this branching model and remains protected as the pool/platform project.
