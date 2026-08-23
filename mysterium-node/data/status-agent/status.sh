#!/bin/sh
set -eu

OUT_DIR="/status"
OUT="$OUT_DIR/status.json"
TMP="$OUT.$$"

INTERVAL="${STATUS_INTERVAL:-30}"
APP_VERSION="${APP_VERSION:-2.4.0}"

mkdir -p "$OUT_DIR"

human_bytes() {
    awk -v n="${1:-0}" '
    BEGIN {
        split("B KiB MiB GiB TiB", u, " ")
        i=1

        while (n >= 1024 && i < 5) {
            n=n/1024
            i++
        }

        if (i == 1)
            printf "%d %s", n, u[i]
        else
            printf "%.2f %s", n, u[i]
    }'
}

json_escape() {
    printf '%s' "$1" |
    sed 's/\\/\\\\/g; s/"/\\"/g'
}

collect() {

    #
    # CPU LOAD
    #

    cpu_load="$(
        awk '{print $1}' /host-proc/loadavg 2>/dev/null ||
        echo "Unknown"
    )"


    #
    # MEMORY
    #

    mem_total="$(
        awk '/^MemTotal:/ {print $2}' /host-proc/meminfo 2>/dev/null ||
        echo 0
    )"

    mem_avail="$(
        awk '/^MemAvailable:/ {print $2}' /host-proc/meminfo 2>/dev/null ||
        echo 0
    )"

    mem_pct="$(
        awk \
          -v total="${mem_total:-0}" \
          -v avail="${mem_avail:-0}" '
        BEGIN {
            if (total > 0)
                printf "%d", ((total-avail)/total)*100
            else
                print "0"
        }'
    )"


    #
    # DISK
    #

    disk_line="$(
        df -Pk /host-root 2>/dev/null |
        awk '
        NR==2 {
            gsub("%","",$5)
            print $4*1024, $5
        }'
    )"

    set -- $disk_line

    disk_free_bytes="${1:-0}"
    disk_pct="${2:-0}"

    disk_free="$(
        human_bytes "$disk_free_bytes"
    )"


    #
    # HOST UPTIME
    #

    uptime_s="$(
        awk '{print int($1)}' /host-proc/uptime 2>/dev/null ||
        echo 0
    )"

    days=$((uptime_s / 86400))
    hours=$(((uptime_s % 86400) / 3600))
    mins=$(((uptime_s % 3600) / 60))

    if [ "$days" -gt 0 ]; then
        host_uptime="${days}d ${hours}h ${mins}m"
    elif [ "$hours" -gt 0 ]; then
        host_uptime="${hours}h ${mins}m"
    else
        host_uptime="${mins}m"
    fi


    #
    # HOST NETWORK INTERFACE
    #
    # Read host routing table directly rather than relying on
    # additional packages inside Alpine.
    #

    net_if="$(
        awk '
        NR > 1 && $2 == "00000000" {
            print $1
            exit
        }' /host-proc/net/route 2>/dev/null ||
        true
    )"

    #
    # Fallback: first non-loopback host interface.
    #

    if [ -z "$net_if" ]; then

        for p in /host-sys/class/net/*; do

            [ -e "$p" ] || continue

            candidate="$(basename "$p")"

            if [ "$candidate" != "lo" ]; then
                net_if="$candidate"
                break
            fi

        done

    fi


    #
    # HOST IP
    #

    host_ip="$(
        ip -4 route get 1.1.1.1 2>/dev/null |
        awk '
        {
            for (i=1; i<=NF; i++) {
                if ($i == "src") {
                    print $(i+1)
                    exit
                }
            }
        }' ||
        true
    )"

    if [ -z "$host_ip" ] || [ "$host_ip" = "127.0.1.1" ]; then
        host_ip="Unknown"
    fi


    #
    # CUMULATIVE HOST DOWNLOAD / UPLOAD
    #

    rx=0
    tx=0

    if [ -n "$net_if" ]; then

        RX_FILE="/host-sys/class/net/$net_if/statistics/rx_bytes"
        TX_FILE="/host-sys/class/net/$net_if/statistics/tx_bytes"

        if [ -r "$RX_FILE" ]; then
            rx="$(cat "$RX_FILE")"
        fi

        if [ -r "$TX_FILE" ]; then
            tx="$(cat "$TX_FILE")"
        fi

    fi

    download="$(
        human_bytes "${rx:-0}"
    )"

    upload="$(
        human_bytes "${tx:-0}"
    )"

    network_io="${download} ↓ / ${upload} ↑"


    #
    # MYSTERIUM NODE UI
    #

    if wget \
        -q \
        -T 3 \
        -O /dev/null \
        http://127.0.0.1:4449/ \
        2>/dev/null
    then

        node_ui="Reachable"
        mysterium="Healthy"
        node_runtime="Running"

    else

        node_ui="Down"
        mysterium="Stopped"
        node_runtime="Unavailable"

    fi


    #
    # PERSISTENT IDENTITY
    #

    if \
        [ -d /mysterium-data ] &&
        find /mysterium-data \
          -mindepth 1 \
          -print \
          -quit \
          2>/dev/null |
        grep -q .
    then

        identity="Protected"

    else

        identity="Missing"

    fi


    updated_at="$(
        date -u +"%Y-%m-%dT%H:%M:%SZ"
    )"


    #
    # WRITE STATUS ATOMICALLY
    #

    cat > "$TMP" <<JSON
{"cpu_load":"$(json_escape "$cpu_load")","memory_pct":"$mem_pct","disk_pct":"$disk_pct","disk_free":"$(json_escape "$disk_free")","host_uptime":"$(json_escape "$host_uptime")","host_ip":"$(json_escape "$host_ip")","mysterium":"$mysterium","portal":"Healthy","nodeui_proxy":"Healthy","node_ui":"$node_ui","portal_ui":"Reachable","identity":"$identity","node_runtime":"$node_runtime","app_version":"$APP_VERSION","network_io":"$(json_escape "$network_io")","download":"$(json_escape "$download")","upload":"$(json_escape "$upload")","network_interface":"$(json_escape "$net_if")","updated_at":"$updated_at"}
JSON

    mv "$TMP" "$OUT"
}


#
# INITIAL COLLECTION
#

collect


#
# CONTINUOUS REFRESH
#

while :; do

    sleep "$INTERVAL"

    collect

done
