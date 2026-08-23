#!/bin/sh
set -u

. /opt/updater/lib.sh

INTERVAL="${UPDATE_CHECK_INTERVAL:-21600}"
LATEST_IMAGE="mysteriumnetwork/myst:latest-alpine"

check_latest() {
    mkdir -p "$UPDATE_DIR"
    tmp="$UPDATE_DIR/latest.env.$$"

    if docker pull "$LATEST_IMAGE" >/dev/null 2>&1; then
        latest_version="$(
            docker run --rm "$LATEST_IMAGE" version 2>/dev/null |
            awk '/^[[:space:]]*Version:/ {print $2; exit}'
        )"
        repo_digest="$(
            docker image inspect "$LATEST_IMAGE" \
              --format '{{index .RepoDigests 0}}' 2>/dev/null || true
        )"
        digest="${repo_digest#*@}"

        if printf '%s' "$latest_version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
            cat > "$tmp" <<EOF
LATEST_VERSION=$latest_version
LATEST_DIGEST=$digest
LAST_CHECKED=$(utc_now)
EOF
            mv "$tmp" "$UPDATE_DIR/latest.env"
            return 0
        fi
    fi

    rm -f "$tmp"
    return 1
}

check_latest || true

while :; do
    sleep "$INTERVAL"
    check_latest || true
done
