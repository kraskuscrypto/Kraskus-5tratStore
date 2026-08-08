#!/usr/bin/env python3
from __future__ import annotations
import re, sys
from pathlib import Path

try:
    import yaml
except Exception:
    print("ERROR: PyYAML is required: python3 -m pip install --user pyyaml==6.0.2")
    raise SystemExit(2)

ROOT = Path(__file__).resolve().parents[1]
EXCLUDE = {".git", "scripts", "templates"}
REQUIRED = {
    "5tratstore-app.yml",
    "5tratstore-review.yml",
    "LICENSES.md",
    "docker-compose.yml",
}

errors = []
warnings = []
ports = {}

def err(app, msg):
    errors.append(f"{app}: {msg}")

def warn(app, msg):
    warnings.append(f"{app}: {msg}")

catalog = ROOT / "umbrel-app-store.yml"
if not catalog.exists():
    errors.append("STORE: missing umbrel-app-store.yml")
else:
    try:
        c = yaml.safe_load(catalog.read_text()) or {}
        if not c.get("id"):
            errors.append("STORE: umbrel-app-store.yml missing id")
        if not c.get("name"):
            errors.append("STORE: umbrel-app-store.yml missing name")
    except Exception as e:
        errors.append(f"STORE: invalid umbrel-app-store.yml: {e}")

app_dirs = []
for p in sorted(ROOT.iterdir()):
    if not p.is_dir() or p.name in EXCLUDE or p.name.startswith("."):
        continue
    if (p / "5tratstore-app.yml").exists() or (p / "docker-compose.yml").exists():
        app_dirs.append(p)

if not app_dirs:
    errors.append("STORE: no app directories detected")

for d in app_dirs:
    aid = d.name
    missing = sorted(x for x in REQUIRED if not (d / x).exists())
    for x in missing:
        err(aid, f"missing required file {x}")
    if missing:
        continue

    try:
        meta = yaml.safe_load((d/"5tratstore-app.yml").read_text()) or {}
    except Exception as e:
        err(aid, f"invalid 5tratstore-app.yml: {e}")
        continue

    for field in ("id","name","tagline","description","version","category",
                  "developer","website","repo","support","port","path"):
        if meta.get(field) in (None, ""):
            err(aid, f"metadata missing {field}")

    if meta.get("id") != aid:
        err(aid, f"directory name and metadata id differ ({meta.get('id')!r})")

    port = meta.get("port")
    if isinstance(port, int):
        if port in ports:
            err(aid, f"port {port} conflicts with {ports[port]}")
        else:
            ports[port] = aid
    else:
        err(aid, "port must be an integer")

    svc = ((meta.get("services") or {}).get("app_proxy") or {}).get("environment") or {}
    if meta.get("uiMode") == "proxy":
        if not svc.get("APP_HOST") or not svc.get("APP_PORT"):
            err(aid, "uiMode proxy requires services.app_proxy.environment APP_HOST and APP_PORT")

    try:
        review = yaml.safe_load((d/"5tratstore-review.yml").read_text()) or {}
        if review.get("appId") != aid:
            err(aid, "review appId does not match app id")
        if str(review.get("appVersion","")) != str(meta.get("version","")):
            err(aid, "review appVersion does not match metadata version")
    except Exception as e:
        err(aid, f"invalid 5tratstore-review.yml: {e}")

    try:
        compose_text = (d/"docker-compose.yml").read_text()
        compose = yaml.safe_load(compose_text) or {}
    except Exception as e:
        err(aid, f"invalid docker-compose.yml: {e}")
        continue

    services = compose.get("services") or {}
    if not services:
        err(aid, "compose has no services")

    for sname, s in services.items():
        if sname == "app_proxy":
            continue
        if not isinstance(s, dict):
            err(aid, f"service {sname} is invalid")
            continue
        image = str(s.get("image") or "")
        if image:
            if ":latest" in image or image.endswith("/latest"):
                err(aid, f"service {sname} uses floating latest image")
            if "@sha256:" not in image:
                err(aid, f"service {sname} image is not pinned by digest")
            if "replace-me" in image or "__" in image:
                err(aid, f"service {sname} contains unresolved image placeholder")
        elif "build" not in s:
            err(aid, f"service {sname} has neither image nor build")

        if s.get("privileged") is True:
            warn(aid, f"service {sname} is privileged; review must justify it")
        if s.get("network_mode") == "host":
            warn(aid, f"service {sname} uses host networking")
        caps = s.get("cap_add") or []
        if caps:
            warn(aid, f"service {sname} adds capabilities: {', '.join(map(str,caps))}")

    # Catch obvious committed secrets without flagging documented text.
    for fp in d.rglob("*"):
        if not fp.is_file() or ".git" in fp.parts:
            continue
        if fp.suffix.lower() in {".png",".jpg",".jpeg",".gif",".webp",".ico"}:
            continue
        try:
            text = fp.read_text(errors="ignore")
        except Exception:
            continue
        patterns = [
            r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
            r'(?im)^\s*(?:api[_-]?key|password|secret|seed|private[_-]?key)\s*[:=]\s*["\']?[A-Za-z0-9+/=_-]{16,}',
        ]
        for pat in patterns:
            if re.search(pat, text):
                err(aid, f"possible secret material in {fp.relative_to(ROOT)}")
                break

print(f"Kraskus 5tratStore validation: {len(app_dirs)} app(s)")
for w in warnings:
    print("WARN:", w)
if errors:
    for e in errors:
        print("ERROR:", e)
    print(f"FAILED: {len(errors)} error(s)")
    raise SystemExit(1)
print("PASS")
