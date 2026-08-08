#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/mysterium-node/docker-compose.yml"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

python3 - "$SRC" "$TMP" <<'PY'
from pathlib import Path
import sys, yaml

src=Path(sys.argv[1])
dst=Path(sys.argv[2])

data=yaml.safe_load(src.read_text())

services=data.get("services",{})
services.pop("app_proxy",None)

dst.write_text(yaml.safe_dump(data,sort_keys=False))
PY

APP_DATA_DIR="/tmp/kraskus-myst-test" \
APP_PASSWORD="test-only" \
docker compose -f "$TMP" config >/dev/null

echo "PASS"
