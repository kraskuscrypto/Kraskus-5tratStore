#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(cat "$APP_DIR/VERSION")"
test -f "$APP_DIR/portal/index.html"
test -f "$APP_DIR/nginx/default.conf"
test -x "$APP_DIR/status-agent/status.sh"
grep -q 'location = /status.json' "$APP_DIR/nginx/default.conf"
grep -q 'status-agent' "$APP_DIR/docker-compose.yml"
python3 - "$APP_DIR" "$VERSION" <<'PY'
from pathlib import Path
import yaml,sys
root=Path(sys.argv[1]); version=sys.argv[2]
app=yaml.safe_load((root/"5tratstore-app.yml").read_text())
review=yaml.safe_load((root/"5tratstore-review.yml").read_text())
assert str(app["version"]) == version
assert str(review["appVersion"]) == version
print("PASS: version synchronization")
PY
echo "PASS: packaged runtime files"
