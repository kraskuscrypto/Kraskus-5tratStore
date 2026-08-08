#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="${1:-}"

if [[ ! "$APP_ID" =~ ^[a-z0-9][a-z0-9-]*$ ]]; then
  echo "Usage: scripts/new-app.sh <lowercase-app-id>"
  exit 1
fi

DEST="$ROOT/$APP_ID"
[[ ! -e "$DEST" ]] || { echo "ERROR: $DEST already exists"; exit 1; }

cp -a "$ROOT/templates/app" "$DEST"
rm -f "$DEST/README.template.md"
sed -i "s/id: replace-me/id: $APP_ID/" "$DEST/5tratstore-app.yml"
sed -i "s/appId: replace-me/appId: $APP_ID/" "$DEST/5tratstore-review.yml"

echo "Created $DEST"
echo "Next: replace all placeholders, pin images, document provenance, then validate."
