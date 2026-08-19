#!/bin/sh

UPDATE_DIR="${UPDATE_DIR:-/update}"
APP_DIR="${APP_DIR:-/app}"
APP_DATA_DIR="${APP_DATA_DIR:-/var/lib/5tratumos/apps/mysterium-node}"
MYST_SERVICE="${MYST_SERVICE:-mysterium}"

json_escape() {
    printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\r/\\r/g; s/\t/\\t/g'
}

utc_now() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

myst_container() {
    docker ps -a \
      --filter "label=com.docker.compose.service=${MYST_SERVICE}" \
      --format '{{.Names}}' 2>/dev/null | head -1
}

compose_project() {
    c="$(myst_container)"
    [ -n "$c" ] || return 1
    docker inspect "$c" \
      --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null
}

running_version() {
    c="$(myst_container)"
    [ -n "$c" ] || { printf 'Unknown'; return 0; }
    docker exec "$c" myst version 2>/dev/null |
      awk '/^[[:space:]]*Version:/ {print $2; exit}'
}

running_image() {
    c="$(myst_container)"
    [ -n "$c" ] || return 1
    docker inspect "$c" --format '{{.Config.Image}}' 2>/dev/null
}

identity_id() {
    c="$(myst_container)"
    [ -n "$c" ] || return 0
    timeout 15 docker exec "$c" myst cli identities list 2>/dev/null |
      grep -Eo '0x[0-9a-fA-F]{40}' |
      head -1 || true
}

node_healthy() {
    c="$(myst_container)"
    [ -n "$c" ] || return 1
    [ "$(docker inspect "$c" --format '{{.State.Running}}' 2>/dev/null)" = "true" ] || return 1
    docker exec "$c" sh -c 'wget -q -T 3 -O /dev/null http://127.0.0.1:4449/' >/dev/null 2>&1
}

write_state() {
    state="${1:-idle}"
    message="${2:-}"
    target="${3:-}"
    backup="${4:-}"
    rollback="${5:-false}"
    mkdir -p "$UPDATE_DIR"
    tmp="$UPDATE_DIR/state.json.$$"
    cat > "$tmp" <<JSON
{"state":"$(json_escape "$state")","message":"$(json_escape "$message")","target_version":"$(json_escape "$target")","backup":"$(json_escape "$backup")","rollback":$rollback,"updated_at":"$(utc_now)"}
JSON
    mv "$tmp" "$UPDATE_DIR/state.json"
}
