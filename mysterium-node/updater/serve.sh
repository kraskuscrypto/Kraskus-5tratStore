#!/bin/sh
set -eu

UPDATE_DIR="${UPDATE_DIR:-/update}"
mkdir -p "$UPDATE_DIR" /tmp/myst-updater-www/cgi-bin

cp /opt/updater/www/cgi-bin/status /tmp/myst-updater-www/cgi-bin/status
cp /opt/updater/www/cgi-bin/update /tmp/myst-updater-www/cgi-bin/update
chmod 755 /tmp/myst-updater-www/cgi-bin/status /tmp/myst-updater-www/cgi-bin/update

if [ ! -f "$UPDATE_DIR/state.json" ]; then
    . /opt/updater/lib.sh
    write_state "idle" "Updater ready." "" "" false
fi

/bin/sh /opt/updater/watch.sh >/update/watcher.log 2>&1 &

exec busybox httpd -f -p 0.0.0.0:33062 -h /tmp/myst-updater-www
