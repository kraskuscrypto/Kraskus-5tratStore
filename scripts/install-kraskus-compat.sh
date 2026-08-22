#!/usr/bin/env bash

set -u

PATCH_URL="https://raw.githubusercontent.com/kraskuscrypto/Kraskus-5tratStore/1a19195700ef8cf0246803adfb5185f45f3b5065/scripts/fix-5tratumos-dynamic-custom-channels.sh"
TMP="$(mktemp /tmp/kraskus-5tratumos-compat.XXXXXX.sh)"

cleanup() {
  rm -f "$TMP" 2>/dev/null || true
}
trap cleanup EXIT

fail() {
  printf '\nKraskus compatibility setup failed.\n' >&2
  printf '%s\n' "$*" >&2
  exit 1
}

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  fail "Run this command with sudo."
fi

command -v curl >/dev/null 2>&1 || fail "curl is required but was not found."
command -v bash >/dev/null 2>&1 || fail "bash is required but was not found."

printf '%s\n' 'Kraskus 5tratumOS Compatibility Setup'
printf '%s\n' '------------------------------------'
printf '%s\n\n' 'Checking this 5tratumOS installation...'

curl -fsSL "$PATCH_URL" -o "$TMP" || fail "Unable to download the compatibility patcher."
chmod 700 "$TMP"

if ! bash -n "$TMP"; then
  fail "Downloaded compatibility patcher failed syntax validation."
fi

"$TMP"
rc=$?

if [ "$rc" -ne 0 ]; then
  exit "$rc"
fi

printf '\nCompatibility setup complete.\n'
printf 'You can now add the Kraskus 5tratStore and install or update Kraskus apps normally.\n'
