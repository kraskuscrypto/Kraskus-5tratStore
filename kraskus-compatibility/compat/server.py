#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import os
import shutil
import subprocess
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

CLI = Path("/host/5tratumos")
STORE = Path("/host/store.json")
DATA = Path("/data")
PORT = int(os.environ.get("PORT", "18403"))
SPLASH = Path("/opt/compat/splash.svg")

OLD = '''        case "${ch}" in
          main|dev|global|custom1|custom2) ;;
          *) die "invalid channel: ${ch}" ;;
        esac

        meta_ch=""
        case "${meta_channel}" in
          main|dev|global|custom1|custom2) meta_ch="${meta_channel}" ;;
        esac
'''

NEW = '''        configured_custom_store() {
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

STATUS = {
    "state": "CHECKING",
    "title": "Checking compatibility…",
    "detail": "Kraskus is checking this 5tratumOS installation.",
    "backup": "",
}


def set_status(state: str, title: str, detail: str, backup: str = "") -> None:
    STATUS.update(state=state, title=title, detail=detail, backup=backup)
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "status.json").write_text(json.dumps(STATUS, indent=2), encoding="utf-8")


def compatible_native(text: str) -> bool:
    return '^custom[-_a-z0-9]{0,48}$' in text and 'custom*)' in text


def run_fix() -> None:
    try:
        if not CLI.is_file():
            set_status("FAIL", "Compatibility check failed", "The 5tratumOS host CLI was not available to the compatibility app.")
            return

        text = CLI.read_text(encoding="utf-8")

        if "configured_custom_store()" in text:
            set_status("READY", "Compatibility ready", "This system was already repaired. Kraskus apps can be installed and updated normally.")
            return

        if compatible_native(text):
            set_status("READY", "Compatibility ready", "This 5tratumOS version already supports dynamically named custom stores. No changes were needed.")
            return

        if OLD not in text:
            set_status("FAIL", "Unsupported 5tratumOS version", "Kraskus did not modify the host because the expected older CLI layout was not found.")
            return

        if not STORE.is_file():
            set_status("FAIL", "Custom store not detected", "Add the Kraskus 5tratStore first, then reopen this app.")
            return

        try:
            store_data = json.loads(STORE.read_text(encoding="utf-8"))
            custom = store_data.get("custom", {}) if isinstance(store_data, dict) else {}
            if not isinstance(custom, dict) or not any(isinstance(v, dict) and v.get("url") for v in custom.values()):
                raise ValueError("no configured custom store")
        except Exception:
            set_status("FAIL", "Custom store configuration unavailable", "Kraskus could not verify the configured custom-store registry, so the host was left unchanged.")
            return

        DATA.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
        backup = DATA / f"5tratumos.pre-kraskus-compat-{stamp}"
        shutil.copy2(CLI, backup)

        CLI.write_text(text.replace(OLD, NEW, 1), encoding="utf-8")

        bash = shutil.which("bash") or "/bin/bash"
        check = subprocess.run([bash, "-n", str(CLI)], capture_output=True, text=True)
        if check.returncode != 0:
            shutil.copy2(backup, CLI)
            set_status("FAIL", "Compatibility repair rolled back", "Validation failed, so the original 5tratumOS CLI was restored automatically.", str(backup))
            return

        set_status("READY", "Compatibility ready", "5tratumOS is now prepared for Kraskus custom-store app updates.", str(backup))
    except Exception as exc:
        set_status("FAIL", "Compatibility setup failed safely", f"Kraskus left the system in a safe state. Detail: {exc}")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/status.json":
            body = json.dumps(STATUS).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path == "/splash.svg":
            try:
                body = SPLASH.read_bytes()
            except Exception:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        state = STATUS["state"]
        if state == "READY":
            body = b'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kraskus Compatibility</title><style>html,body{margin:0;background:#02070d;min-height:100%;width:100%}body{display:grid;place-items:center;min-height:100vh}.splash{width:min(100vw,1448px);height:auto;display:block}</style></head><body><img class="splash" src="/splash.svg" alt="Kraskus Compatibility complete. Thank you for updating. You may now uninstall this app."></body></html>'''
        else:
            good = False
            badge = state
            detail = html.escape(STATUS["detail"])
            title = html.escape(STATUS["title"])
            body = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kraskus Compatibility</title><style>
body{{margin:0;background:#0d0b14;color:#f6f2ff;font-family:Inter,system-ui,-apple-system,sans-serif;display:grid;min-height:100vh;place-items:center}}main{{width:min(680px,calc(100% - 40px));background:#171220;border:1px solid #342744;border-radius:22px;padding:34px;box-shadow:0 20px 70px #0008}}.brand{{font-weight:800;letter-spacing:.08em;color:#c9a7ff}}h1{{font-size:34px;margin:12px 0}}p{{color:#cfc7d9;font-size:17px;line-height:1.55}}.badge{{display:inline-block;padding:8px 12px;border-radius:999px;background:#493718;color:#ffd479;font-weight:800}}small{{color:#9389a0}}</style></head><body><main><div class="brand">KRASKUS CRYPTO</div><h1>{title}</h1><div class="badge">{badge}</div><p>{detail}</p><p><small>No host changes are made for unsupported layouts.</small></p></main></body></html>'''.encode()

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        return


if __name__ == "__main__":
    run_fix()
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
