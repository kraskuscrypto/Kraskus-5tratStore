#!/usr/bin/env bash
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(cat "$APP_DIR/VERSION")"

test -f "$APP_DIR/portal/index.html"
test -f "$APP_DIR/portal/updater.js"
test -f "$APP_DIR/nginx/default.conf"
test -x "$APP_DIR/status-agent/status.sh"
test -f "$APP_DIR/updater/lib.sh"
test -f "$APP_DIR/updater/serve.sh"
test -f "$APP_DIR/updater/watch.sh"
test -f "$APP_DIR/updater/update.sh"
test -f "$APP_DIR/updater/www/cgi-bin/status"
test -f "$APP_DIR/updater/www/cgi-bin/update"

grep -q 'location = /status.json' "$APP_DIR/nginx/default.conf"
grep -q 'location /update-api/' "$APP_DIR/nginx/default.conf"
grep -q 'updater.js' "$APP_DIR/nginx/default.conf"
grep -q 'status-agent' "$APP_DIR/docker-compose.yml"
grep -q 'update-agent' "$APP_DIR/docker-compose.yml"
grep -q '/var/run/docker.sock:/var/run/docker.sock' "$APP_DIR/docker-compose.yml"
grep -q '0.0.0.0:33060:80' "$APP_DIR/docker-compose.yml"
grep -q 'mysteriumnetwork/myst:1.39.5-alpine@sha256:d0c270c6bcb50c1004ba355c264f85aa16b3a5a414f8b9f8f5b0f449ea85a142' "$APP_DIR/docker-compose.yml"

python3 - "$APP_DIR" "$VERSION" <<'PY'
from pathlib import Path
import yaml,sys
root=Path(sys.argv[1]); version=sys.argv[2]
app=yaml.safe_load((root/"5tratstore-app.yml").read_text())
review=yaml.safe_load((root/"5tratstore-review.yml").read_text())
compose=yaml.safe_load((root/"docker-compose.yml").read_text())
assert str(app["version"]) == version
assert str(review["appVersion"]) == version
assert review["security"]["dockerSocket"] is True
assert "update-agent" in compose["services"]
assert compose["services"]["portal"]["ports"] == ["0.0.0.0:33060:80"]
print("PASS: version synchronization")
print("PASS: updater security declaration")
PY

echo "PASS: packaged runtime files"
