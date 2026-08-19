#!/bin/sh

UPDATE_DIR="${UPDATE_DIR:-/update}"
APP_DIR="${APP_DIR:-/app}"
APP_DATA_DIR="${APP_DATA_DIR:-/var/lib/5tratumos/apps/mysterium-node}"
MYST_SERVICE="${MYST_SERVICE:-mysterium}"
TARGET_COMPOSE_PROJECT="${TARGET_COMPOSE_PROJECT:-}"

json_escape() {
    printf '%s' "${1:-}" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\r/\\r/g; s/\t/\\t/g'
}

utc_now() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# Resolve the updater's own Compose project. In production the update-agent and
# mysterium services are siblings in the same Compose project. A standalone
# test may provide TARGET_COMPOSE_PROJECT explicitly. There is intentionally no
# broad fallback to "the first mysterium service" on the Docker host.
compose_project() {
    if [ -n "$TARGET_COMPOSE_PROJECT" ]; then
        printf '%s' "$TARGET_COMPOSE_PROJECT"
        return 0
    fi

    self_id="${HOSTNAME:-}"
    [ -n "$self_id" ] || return 1

    project="$(docker inspect "$self_id" \
      --format '{{index .Config.Labels "com.docker.compose.project"}}' 2>/dev/null || true)"

    [ -n "$project" ] || return 1
    [ "$project" != "<no value>" ] || return 1
    printf '%s' "$project"
}

myst_container() {
    project="$(compose_project 2>/dev/null || true)"
    [ -n "$project" ] || return 1

    docker ps -a \
      --filter "label=com.docker.compose.project=${project}" \
      --filter "label=com.docker.compose.service=${MYST_SERVICE}" \
      --format '{{.Names}}' 2>/dev/null | head -1
}

running_version() {
    c="$(myst_container 2>/dev/null || true)"
    [ -n "$c" ] || { printf 'Unknown'; return 0; }
    docker exec "$c" myst version 2>/dev/null |
      awk '/^[[:space:]]*Version:/ {print $2; exit}'
}

running_image() {
    c="$(myst_container 2>/dev/null || true)"
    [ -n "$c" ] || return 1
    docker inspect "$c" --format '{{.Config.Image}}' 2>/dev/null
}

identity_id() {
    c="$(myst_container 2>/dev/null || true)"
    [ -n "$c" ] || return 0
    timeout 15 docker exec "$c" myst cli identities list 2>/dev/null |
      grep -Eo '0x[0-9a-fA-F]{40}' |
      head -1 || true
}

node_healthy() {
    c="$(myst_container 2>/dev/null || true)"
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
