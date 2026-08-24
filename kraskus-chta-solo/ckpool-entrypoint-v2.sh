#!/bin/sh
set -eu

CONFIG="/kraskus-config/ckpool.conf"
REQUEST="/kraskus-config/reload-request.json"
ACK="/www/reload-ack.json"

CKPOOL_BIN="$(command -v ckpool || true)"

if [ -z "$CKPOOL_BIN" ]; then
    CKPOOL_BIN="/usr/local/bin/ckpool"
fi

CHILD=""
LAST_REQUEST_ID=""

stop_child() {
    if [ -n "$CHILD" ] && kill -0 "$CHILD" 2>/dev/null; then
        kill -TERM "$CHILD" 2>/dev/null || true
        wait "$CHILD" 2>/dev/null || true
    fi

    CHILD=""
}

payout_configured() {
    VALUE="$(
        sed -n \
          's/^[[:space:]]*"btcaddress"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' \
          "$CONFIG" 2>/dev/null \
        | head -n 1
    )"

    [ -n "$VALUE" ]
}

start_child() {
    if ! payout_configured; then
        echo "[chta-v2] Payout not configured; CKPool remains stopped"
        return 2
    fi

    echo "[chta-v2] Starting CKPool"

    "$CKPOOL_BIN" -c "$CONFIG" &
    CHILD=$!

    sleep 1

    if ! kill -0 "$CHILD" 2>/dev/null; then
        echo "[chta-v2] CKPool failed to start"
        wait "$CHILD" 2>/dev/null || true
        CHILD=""
        return 1
    fi

    return 0
}

request_id() {
    sed -n \
      's/.*"request_id"[[:space:]]*:[[:space:]]*"\([0-9A-Za-z_-]*\)".*/\1/p' \
      "$REQUEST" 2>/dev/null \
    | head -n 1
}

write_ack() {
    ID="$1"
    OK="$2"
    ERROR="${3:-}"

    TMP="/www/.reload-ack.$$"

    if [ "$OK" = "true" ]; then
        printf '{"request_id":"%s","ok":true}\n' "$ID" > "$TMP"
    else
        ESCAPED="$(printf '%s' "$ERROR" | sed 's/\\/\\\\/g; s/"/\\"/g')"
        printf \
          '{"request_id":"%s","ok":false,"error":"%s"}\n' \
          "$ID" "$ESCAPED" > "$TMP"
    fi

    mv "$TMP" "$ACK"
}

handle_request() {
    ID="$(request_id)"

    if [ -z "$ID" ] || [ "$ID" = "$LAST_REQUEST_ID" ]; then
        return 0
    fi

    echo "[chta-v2] Reload request received"

    stop_child

    if start_child; then
        write_ack "$ID" true
        echo "[chta-v2] Reload acknowledged"
    else
        RC=$?

        if [ "$RC" -eq 2 ]; then
            write_ack "$ID" false "Payout address is not configured."
        else
            write_ack "$ID" false "CKPool failed to start."
        fi
    fi

    LAST_REQUEST_ID="$ID"
}

trap 'stop_child; exit 0' TERM INT HUP

echo "[chta-v2] Supervisor started"

while [ ! -s "$CONFIG" ]; do
    sleep 1
done

# Start immediately only when first-run configuration already has a payout.
start_child || true

while :; do
    if [ -n "$CHILD" ] && ! kill -0 "$CHILD" 2>/dev/null; then
        wait "$CHILD" 2>/dev/null || true
        CHILD=""
        echo "[chta-v2] CKPool exited"
    fi

    if [ -s "$REQUEST" ]; then
        handle_request
    fi

    sleep 1
done
