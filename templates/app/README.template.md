# App submission checklist

1. Copy this directory to a new lowercase app ID at repository root.
2. Replace every placeholder.
3. Pin every image by stable version tag and immutable `@sha256:` digest.
4. Use `${APP_DATA_DIR}` for persistent application data.
5. Never commit passwords, API keys, wallet seeds, certificates, private keys,
   personal addresses, databases, or runtime state.
6. Keep `5tratstore-review.yml` at `status: proposed` until reviewed.
7. Run:
   - `python3 scripts/validate_store.py`
   - `scripts/validate-compose.sh <app-id>`
8. Perform install/start/restart/update/uninstall testing before claiming it.
