#!/bin/sh
set -eu

UPDATE_DIR="${UPDATE_DIR:-/update}"
mkdir -p "$UPDATE_DIR"

# The Docker CLI image is intentionally minimal. Install Python at runtime so
# the updater API has deterministic GET/POST routing without relying on
# BusyBox CGI support, which varies by Alpine/BusyBox build.
if ! command -v python3 >/dev/null 2>&1; then
    apk add --no-cache python3 >/dev/null
fi

if [ ! -f "$UPDATE_DIR/state.json" ]; then
    . /opt/updater/lib.sh
    write_state "idle" "Updater ready." "" "" false
fi

/bin/sh /opt/updater/watch.sh >"$UPDATE_DIR/watcher.log" 2>&1 &

exec python3 /opt/updater/server.py
