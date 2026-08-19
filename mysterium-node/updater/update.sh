#!/bin/sh
set -u

. /opt/updater/lib.sh

TARGET="${1:-}"
LOCK_DIR="$UPDATE_DIR/update.lock"
BACKUP_ROOT="$APP_DATA_DIR/data/backups"
DATA_ROOT="$APP_DATA_DIR/data"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

cleanup() {
    rm -rf "$LOCK_DIR"
}
trap cleanup EXIT INT TERM

fail_state() {
    write_state "failed" "$1" "$TARGET" "${BACKUP_FILE:-}" false
    printf '%s %s\n' "$(utc_now)" "$1" >> "$UPDATE_DIR/history.log"
    exit 1
}

wait_healthy() {
    i=0
    while [ "$i" -lt 60 ]; do
        if node_healthy; then
            return 0
        fi
        i=$((i+1))
        sleep 2
    done
    return 1
}

replace_myst_image() {
    new_ref="$1"
    tmp="$COMPOSE_FILE.$$"
    awk -v ref="$new_ref" '
      /^  mysterium:/ {in_myst=1; print; next}
      in_myst && /^    image:/ {print "    image: " ref; in_myst=0; next}
      {print}
    ' "$COMPOSE_FILE" > "$tmp" || return 1
    mv "$tmp" "$COMPOSE_FILE"
}

restore_data() {
    [ -n "${BACKUP_FILE:-}" ] || return 1
    [ -f "$BACKUP_FILE" ] || return 1
    find "$DATA_ROOT/mysterium" -mindepth 1 -delete 2>/dev/null || true
    tar -xzf "$BACKUP_FILE" -C "$DATA_ROOT"
}

rollback() {
    reason="$1"
    write_state "rolling_back" "$reason" "$TARGET" "${BACKUP_FILE:-}" true

    APP_DATA_DIR="$APP_DATA_DIR" docker compose \
      -p "$PROJECT" \
      -f "$COMPOSE_FILE" \
      --project-directory "$APP_DIR" \
      stop mysterium >/dev/null 2>&1 || true

    replace_myst_image "$OLD_IMAGE" || true
    restore_data || true

    APP_DATA_DIR="$APP_DATA_DIR" docker compose \
      -p "$PROJECT" \
      -f "$COMPOSE_FILE" \
      --project-directory "$APP_DIR" \
      up -d --no-deps --force-recreate mysterium >/dev/null 2>&1 || true

    if wait_healthy; then
        write_state "rolled_back" "$reason Previous node image and data were restored." "$TARGET" "$BACKUP_FILE" true
    else
        write_state "rollback_failed" "$reason Automatic rollback also failed; manual recovery is required." "$TARGET" "$BACKUP_FILE" true
    fi

    printf '%s rollback target=%s reason=%s backup=%s\n' \
      "$(utc_now)" "$TARGET" "$reason" "$BACKUP_FILE" >> "$UPDATE_DIR/history.log"
    exit 1
}

printf '%s' "$TARGET" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || fail_state "Invalid target version."

mkdir -p "$UPDATE_DIR" "$BACKUP_ROOT" "$DATA_ROOT/mysterium"

CONTAINER="$(myst_container)"
[ -n "$CONTAINER" ] || fail_state "Mysterium container was not found."
PROJECT="$(compose_project)"
[ -n "$PROJECT" ] || fail_state "Docker Compose project could not be determined."
CURRENT="$(running_version)"
OLD_IMAGE="$(running_image)"
[ -n "$OLD_IMAGE" ] || fail_state "Current Mysterium image could not be determined."
IDENTITY_BEFORE="$(identity_id)"

TARGET_TAG="mysteriumnetwork/myst:${TARGET}-alpine"
write_state "pulling" "Downloading and verifying Mysterium Node ${TARGET}." "$TARGET" "" false

docker pull "$TARGET_TAG" >/dev/null 2>&1 || fail_state "Docker could not pull ${TARGET_TAG}."

IMAGE_VERSION="$(
    docker run --rm "$TARGET_TAG" version 2>/dev/null |
    awk '/^[[:space:]]*Version:/ {print $2; exit}'
)"
[ "$IMAGE_VERSION" = "$TARGET" ] || fail_state "Pulled image reports version ${IMAGE_VERSION:-Unknown}, expected ${TARGET}."

REPO_DIGEST="$(docker image inspect "$TARGET_TAG" --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
DIGEST="${REPO_DIGEST#*@}"
printf '%s' "$DIGEST" | grep -Eq '^sha256:[0-9a-f]{64}$' || fail_state "Could not resolve an immutable digest for ${TARGET_TAG}."
TARGET_REF="${TARGET_TAG}@${DIGEST}"

write_state "stopping" "Stopping the node for a consistent backup." "$TARGET" "" false
APP_DATA_DIR="$APP_DATA_DIR" docker compose \
  -p "$PROJECT" \
  -f "$COMPOSE_FILE" \
  --project-directory "$APP_DIR" \
  stop mysterium >/dev/null 2>&1 || fail_state "Could not stop the Mysterium service."

STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_ROOT/mysterium-backup-${STAMP}-v${CURRENT}.tar.gz"
write_state "backing_up" "Creating a persistent node backup." "$TARGET" "$BACKUP_FILE" false

tar -czf "$BACKUP_FILE" -C "$DATA_ROOT" mysterium || fail_state "Backup creation failed."
[ -s "$BACKUP_FILE" ] || fail_state "Backup file is empty."

write_state "installing" "Installing Mysterium Node ${TARGET}." "$TARGET" "$BACKUP_FILE" false
replace_myst_image "$TARGET_REF" || rollback "Could not update the compose image reference."

APP_DATA_DIR="$APP_DATA_DIR" docker compose \
  -p "$PROJECT" \
  -f "$COMPOSE_FILE" \
  --project-directory "$APP_DIR" \
  up -d --no-deps --force-recreate mysterium >/dev/null 2>&1 || rollback "Docker could not recreate the Mysterium service."

write_state "verifying" "Waiting for the updated node to become healthy." "$TARGET" "$BACKUP_FILE" false
wait_healthy || rollback "The updated node did not become healthy within the verification window."

CURRENT_AFTER="$(running_version)"
[ "$CURRENT_AFTER" = "$TARGET" ] || rollback "The running node reports ${CURRENT_AFTER:-Unknown} instead of ${TARGET}."

IDENTITY_AFTER="$(identity_id)"
if [ -n "$IDENTITY_BEFORE" ] && [ -n "$IDENTITY_AFTER" ] && [ "$IDENTITY_BEFORE" != "$IDENTITY_AFTER" ]; then
    rollback "The node identity changed during the update."
fi

if ! find "$DATA_ROOT/mysterium" -mindepth 1 -print -quit 2>/dev/null | grep -q .; then
    rollback "Persistent Mysterium data is missing after the update."
fi

write_state "success" "Mysterium Node updated successfully from ${CURRENT} to ${TARGET}." "$TARGET" "$BACKUP_FILE" false
printf '%s success from=%s to=%s image=%s backup=%s\n' \
  "$(utc_now)" "$CURRENT" "$TARGET" "$TARGET_REF" "$BACKUP_FILE" >> "$UPDATE_DIR/history.log"

# Keep the five newest automatic backups.
ls -1t "$BACKUP_ROOT"/mysterium-backup-*.tar.gz 2>/dev/null |
  awk 'NR>5' |
  xargs -r rm -f

exit 0
