#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/mysterium-node/docker-compose.yml"

MYST_TAG="mysteriumnetwork/myst:1.38.5-alpine"
PORTAL_TAG="nginx:1.27-alpine"

echo "===== PULL OFFICIAL IMAGES ====="
sudo docker pull "$MYST_TAG"
sudo docker pull "$PORTAL_TAG"

myst_ref="$(sudo docker image inspect "$MYST_TAG" --format '{{index .RepoDigests 0}}')"
portal_ref="$(sudo docker image inspect "$PORTAL_TAG" --format '{{index .RepoDigests 0}}')"

[[ "$myst_ref" == *@sha256:* ]] || { echo "ERROR: Mysterium RepoDigest unresolved"; exit 1; }
[[ "$portal_ref" == *@sha256:* ]] || { echo "ERROR: nginx RepoDigest unresolved"; exit 1; }

myst_image="${MYST_TAG}@${myst_ref##*@}"
portal_image="${PORTAL_TAG}@${portal_ref##*@}"

echo "Mysterium: $myst_image"
echo "Portal:    $portal_image"

python3 - "$COMPOSE" "$myst_image" "$portal_image" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); myst=sys.argv[2]; portal=sys.argv[3]
t=p.read_text()
t=t.replace("__MYST_IMAGE__", myst).replace("__PORTAL_IMAGE__", portal)
p.write_text(t)
PY

if grep -q '__MYST_IMAGE__\|__PORTAL_IMAGE__' "$COMPOSE"; then
  echo "ERROR: placeholders remain"
  exit 1
fi

echo
echo "===== VALIDATE COMPOSE ====="
APP_DATA_DIR="/tmp/kraskus-myst-test" APP_PASSWORD="test-only" \
  docker compose -f "$COMPOSE" config >/dev/null
echo "PASS"
