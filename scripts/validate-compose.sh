#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="${1:?Usage: scripts/validate-compose.sh <app-id>}"
SRC="$ROOT/$APP_ID/docker-compose.yml"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

[[ -f "$SRC" ]] || { echo "ERROR: $SRC not found"; exit 1; }

python3 - "$SRC" "$TMP" <<'PY'
from pathlib import Path
import sys, yaml
src, dst = map(Path, sys.argv[1:3])
data = yaml.safe_load(src.read_text()) or {}
services = data.get("services") or {}
services.pop("app_proxy", None)
dst.write_text(yaml.safe_dump(data, sort_keys=False))
PY

APP_DATA_DIR="/tmp/kraskus-${APP_ID}-validate" \
APP_PASSWORD="validation-only" \
docker compose -f "$TMP" config >/dev/null

echo "PASS: $APP_ID compose"
