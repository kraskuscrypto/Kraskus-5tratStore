#!/usr/bin/env bash

set -u

CLI="/usr/local/bin/5tratumos"
STORE_CONFIG_FILE="${FIVETRATUMOS_STORE_CONFIG_FILE:-/etc/5tratumos/store.json}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="${CLI}.pre-kraskus-dynamic-custom-channel-${STAMP}"

fail() {
  printf 'KRASKUS_5TRATUMOS_COMPAT=FAIL\n' >&2
  printf '%s\n' "$*" >&2
  exit 1
}

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  fail "run as root: sudo $0"
fi

[ -f "$CLI" ] || fail "5tratumOS CLI not found: $CLI"
[ -f "$STORE_CONFIG_FILE" ] || fail "store config not found: $STORE_CONFIG_FILE"

if grep -q 'configured_custom_store()' "$CLI"; then
  printf 'KRASKUS_5TRATUMOS_COMPAT=ALREADY_APPLIED\n'
  exit 0
fi

if ! grep -q 'main|dev|global|custom1|custom2) ;;' "$CLI"; then
  fail "affected 5tratumOS validation block not found; refusing to modify unknown CLI version"
fi

cp -a "$CLI" "$BACKUP" || fail "unable to create backup: $BACKUP"

python3 - "$CLI" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text(encoding="utf-8")

old = '''        case "${ch}" in
          main|dev|global|custom1|custom2) ;;
          *) die "invalid channel: ${ch}" ;;
        esac

        meta_ch=""
        case "${meta_channel}" in
          main|dev|global|custom1|custom2) meta_ch="${meta_channel}" ;;
        esac
'''

new = '''        configured_custom_store() {
          local slot="${1:-}"

          python3 - "${slot}" "${STORE_CONFIG_FILE}" <<'PYCFG'
import json
import sys

slot = (sys.argv[1] if len(sys.argv) > 1 else "").strip().lower()
path = sys.argv[2] if len(sys.argv) > 2 else ""

if not slot or not path:
    sys.exit(1)

try:
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
except Exception:
    sys.exit(1)

custom = data.get("custom") if isinstance(data, dict) else {}
entry = custom.get(slot) if isinstance(custom, dict) else None

if not isinstance(entry, dict):
    sys.exit(1)

url = str(entry.get("url") or "").strip()
sys.exit(0 if url else 1)
PYCFG
        }

        case "${ch}" in
          main|dev|global)
            ;;
          custom*)
            configured_custom_store "${ch}" ||
              die "invalid channel: ${ch}"
            ;;
          *)
            die "invalid channel: ${ch}"
            ;;
        esac

        meta_ch=""
        case "${meta_channel}" in
          main|dev|global)
            meta_ch="${meta_channel}"
            ;;
          custom*)
            if configured_custom_store "${meta_channel}"; then
              meta_ch="${meta_channel}"
            fi
            ;;
        esac
'''

if old not in s:
    raise SystemExit("expected stale channel-validation block not found")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
PY

if ! bash -n "$CLI"; then
  cp -a "$BACKUP" "$CLI"
  fail "patched CLI failed bash syntax validation; original restored from $BACKUP"
fi

chmod 755 "$CLI"

printf 'KRASKUS_5TRATUMOS_COMPAT=PASS\n'
printf 'BACKUP=%s\n' "$BACKUP"
printf 'NEXT=retry the native 5tratumOS app update\n'
