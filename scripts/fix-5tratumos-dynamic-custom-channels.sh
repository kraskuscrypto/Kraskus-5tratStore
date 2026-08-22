#!/usr/bin/env bash

set -u

CLI="/usr/local/bin/5tratumos"
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

if grep -q '# KRASKUS_DYNAMIC_CUSTOM_UPDATE_V2' "$CLI" &&
   grep -q '# KRASKUS_DYNAMIC_CUSTOM_META_V2' "$CLI"; then
  printf 'KRASKUS_5TRATUMOS_COMPAT=ALREADY_APPLIED\n'
  exit 0
fi

cp -a "$CLI" "$BACKUP" || fail "unable to create backup: $BACKUP"

if ! python3 - "$CLI" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
text = p.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)

stale_update = 'main|dev|global|custom1|custom2) ;;'
stale_meta = 'main|dev|global|custom1|custom2) meta_ch="${meta_channel}" ;;'

update_hits = [i for i, line in enumerate(lines) if line.strip() == stale_update]
meta_hits = [i for i, line in enumerate(lines) if line.strip() == stale_meta]

if len(update_hits) != 1 or len(meta_hits) != 1:
    raise SystemExit(
        "expected exactly one stale app-update line and one stale metadata-channel line; "
        f"found update={len(update_hits)} meta={len(meta_hits)}"
    )

ui = update_hits[0]
mi = meta_hits[0]
if ui >= mi:
    raise SystemExit("unexpected lifecycle validation ordering")

uindent = lines[ui][:len(lines[ui]) - len(lines[ui].lstrip())]
mindent = lines[mi][:len(lines[mi]) - len(lines[mi].lstrip())]

update_replacement = [
    uindent + '# KRASKUS_DYNAMIC_CUSTOM_UPDATE_V2\n',
    uindent + 'main|dev|global|custom1|custom2)\n',
    uindent + '  ;;\n',
    uindent + 'custom*)\n',
    uindent + '  [[ "${ch}" =~ ^custom[-_a-z0-9]{0,48}$ ]] ||\n',
    uindent + '    die "invalid channel: ${ch}"\n',
    uindent + '  [ -d "${ROOT_DIR}/store/${ch}" ] ||\n',
    uindent + '    die "custom channel is not synced: ${ch}"\n',
    uindent + '  ;;\n',
]

meta_replacement = [
    mindent + '# KRASKUS_DYNAMIC_CUSTOM_META_V2\n',
    mindent + 'main|dev|global|custom1|custom2)\n',
    mindent + '  meta_ch="${meta_channel}"\n',
    mindent + '  ;;\n',
    mindent + 'custom*)\n',
    mindent + '  if [[ "${meta_channel}" =~ ^custom[-_a-z0-9]{0,48}$ ]] &&\n',
    mindent + '     [ -d "${ROOT_DIR}/store/${meta_channel}" ]; then\n',
    mindent + '    meta_ch="${meta_channel}"\n',
    mindent + '  fi\n',
    mindent + '  ;;\n',
]

lines[ui:ui+1] = update_replacement
mi += len(update_replacement) - 1
lines[mi:mi+1] = meta_replacement
p.write_text(''.join(lines), encoding='utf-8')
PY
then
  cp -a "$BACKUP" "$CLI"
  fail "known lifecycle layout was not matched exactly; original restored from $BACKUP"
fi

if ! bash -n "$CLI"; then
  cp -a "$BACKUP" "$CLI"
  fail "patched CLI failed bash syntax validation; original restored from $BACKUP"
fi

if ! grep -q '# KRASKUS_DYNAMIC_CUSTOM_UPDATE_V2' "$CLI" ||
   ! grep -q '# KRASKUS_DYNAMIC_CUSTOM_META_V2' "$CLI" ||
   grep -q 'main|dev|global|custom1|custom2) ;;' "$CLI" ||
   grep -q 'main|dev|global|custom1|custom2) meta_ch="${meta_channel}" ;;' "$CLI"; then
  cp -a "$BACKUP" "$CLI"
  fail "post-repair lifecycle validation failed; original restored from $BACKUP"
fi

chmod 755 "$CLI"

printf 'KRASKUS_5TRATUMOS_COMPAT=PASS\n'
printf 'BACKUP=%s\n' "$BACKUP"
printf 'NEXT=retry the native 5tratumOS app update\n'
