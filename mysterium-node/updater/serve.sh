#!/bin/sh
set -eu

UPDATE_DIR="${UPDATE_DIR:-/update}"
mkdir -p "$UPDATE_DIR" /tmp/myst-updater-www/cgi-bin

# The pinned Docker CLI image intentionally ships a minimal BusyBox build
# without the httpd applet. Install busybox-extras only when needed so the
# updater can expose its localhost-only CGI API while retaining the Docker CLI.
if ! busybox --list 2>/dev/null | grep -qx 'httpd'; then
    apk add --no-cache busybox-extras >/dev/null
fi

cp /opt/updater/www/cgi-bin/status /tmp/myst-updater-www/cgi-bin/status
cp /opt/updater/www/cgi-bin/update /tmp/myst-updater-www/cgi-bin/update
chmod 755 /tmp/myst-updater-www/cgi-bin/status /tmp/myst-updater-www/cgi-bin/update

if [ ! -f "$UPDATE_DIR/state.json" ]; then
    . /opt/updater/lib.sh
    write_state "idle" "Updater ready." "" "" false
fi

/bin/sh /opt/updater/watch.sh >"$UPDATE_DIR/watcher.log" 2>&1 &

exec httpd -f -p 0.0.0.0:33062 -h /tmp/myst-updater-www
