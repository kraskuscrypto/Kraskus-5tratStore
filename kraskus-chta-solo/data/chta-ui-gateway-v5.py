from http.server import (
    SimpleHTTPRequestHandler,
    ThreadingHTTPServer,
)
from pathlib import Path
import http.client
import json
import os
import urllib.parse


STATIC = Path("/app/ui/static")

COMPAT_JS = Path(
    "/qualification/chta-ui-compat-v1.js"
)

BACKEND_HOST = os.environ.get(
    "CHTA_BACKEND_HOST",
    "kraskus",
)

BACKEND_PORT = int(
    os.environ.get(
        "CHTA_BACKEND_PORT",
        "18411",
    )
)

LISTEN_PORT = int(
    os.environ.get(
        "CHTA_UI_PORT",
        "18412",
    )
)


HOP_BY_HOP = {
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
}


class Handler(SimpleHTTPRequestHandler):
    server_version = "KraskusCHTAGateway/1"

    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            directory=str(STATIC),
            **kwargs,
        )

    def log_message(self, fmt, *args):
        print(
            "%s - %s"
            % (
                self.address_string(),
                fmt % args,
            ),
            flush=True,
        )

    def do_GET(self):
        parsed = urllib.parse.urlsplit(
            self.path
        )

        if parsed.path.startswith("/api/"):
            if parsed.path == "/api/overview":
                return self._proxy_overview()

            return self._proxy()

        if parsed.path in ("", "/"):
            return self._serve_index()

        if (
            parsed.path
            == "/chta-ui-compat-v2.js"
        ):
            return self._serve_compat_js()

        return super().do_GET()

    def _serve_index(self):
        index = STATIC / "index-bch.html"
        data = index.read_bytes()

        prefix = self.headers.get(
            "X-Forwarded-Prefix",
            "",
        ).rstrip("/")

        text = data.decode("utf-8")

        compat_src = (
            f"{prefix}/chta-ui-compat-v2.js"
            if prefix
            else "/chta-ui-compat-v2.js"
        )

        compat_tag = (
            '<script src="'
            + compat_src
            + '"></script>'
        )

        if (
            "chta-ui-compat-v2.js"
            not in text
        ):
            assert "</body>" in text

            text = text.replace(
                "</body>",
                compat_tag + "\n</body>",
                1,
            )

        if prefix:
            replacements = {
                'href="/kraskus-chta.css"':
                    f'href="{prefix}/kraskus-chta.css"',
                'href="/kraskus-mining-v2.css"':
                    f'href="{prefix}/kraskus-mining-v2.css"',
                'src="/kraskus-chta.js"':
                    f'src="{prefix}/kraskus-chta.js"',
                'src="/kraskus-mining-v2.js"':
                    f'src="{prefix}/kraskus-mining-v2.js"',
            }

            for source, target in replacements.items():
                text = text.replace(
                    source,
                    target,
                )

        data = text.encode("utf-8")

        self.send_response(200)
        self.send_header(
            "Content-Type",
            "text/html; charset=utf-8",
        )
        self.send_header(
            "Content-Length",
            str(len(data)),
        )
        self.end_headers()
        self.wfile.write(data)

    def _serve_compat_js(self):
        if not COMPAT_JS.is_file():
            return self.send_error(404)

        data = COMPAT_JS.read_bytes()

        self.send_response(200)

        self.send_header(
            "Content-Type",
            "application/javascript; charset=utf-8",
        )

        self.send_header(
            "Cache-Control",
            "no-store",
        )

        self.send_header(
            "Content-Length",
            str(len(data)),
        )

        self.end_headers()

        if self.command != "HEAD":
            self.wfile.write(data)

    def do_HEAD(self):
        if self.path.startswith("/api/"):
            return self._proxy()

        parsed = urllib.parse.urlsplit(self.path)

        if parsed.path in ("", "/"):
            self.path = "/index-bch.html"

        return super().do_HEAD()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy()

        self.send_error(404)

    def _backend_get(self, path):
        connection = http.client.HTTPConnection(
            BACKEND_HOST,
            BACKEND_PORT,
            timeout=15,
        )

        try:
            connection.request(
                "GET",
                path,
                headers={
                    "Host":
                        f"{BACKEND_HOST}:{BACKEND_PORT}",
                    "Accept":
                        "application/json",
                },
            )

            response = connection.getresponse()
            data = response.read()

            return (
                response.status,
                response.getheaders(),
                data,
            )

        finally:
            connection.close()

    def _send_backend_response(
        self,
        status,
        response_headers,
        data,
    ):
        self.send_response(status)

        for key, value in response_headers:
            lower = key.lower()

            if lower in HOP_BY_HOP:
                continue

            if lower == "content-length":
                continue

            self.send_header(
                key,
                value,
            )

        self.send_header(
            "Content-Length",
            str(len(data)),
        )

        self.end_headers()

        if self.command != "HEAD":
            self.wfile.write(data)

    def _send_json(
        self,
        status,
        payload,
        extra_headers=None,
    ):
        data = json.dumps(
            payload,
            separators=(",", ":"),
        ).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )

        self.send_header(
            "Cache-Control",
            "no-store",
        )

        if extra_headers:
            for key, value in extra_headers.items():
                self.send_header(
                    key,
                    value,
                )

        self.send_header(
            "Content-Length",
            str(len(data)),
        )

        self.end_headers()

        if self.command != "HEAD":
            self.wfile.write(data)

    @staticmethod
    def _decode_json_object(data):
        try:
            payload = json.loads(
                data.decode("utf-8")
            )
        except Exception:
            return None

        if isinstance(payload, dict):
            return payload

        return None

    def _proxy_overview(self):
        status, headers, data = (
            self._backend_get(
                self.path
            )
        )

        # Successful authoritative overview:
        # return the backend response untouched.
        if status != 503:
            return self._send_backend_response(
                status,
                headers,
                data,
            )

        error_payload = (
            self._decode_json_object(
                data
            )
        )

        # Degrade only the explicitly approved condition.
        # Any unrelated backend failure remains authoritative.
        if (
            not error_payload
            or error_payload.get("error")
            != "round_telemetry_unavailable"
        ):
            return self._send_backend_response(
                status,
                headers,
                data,
            )

        parts = {}

        for name in (
            "status",
            "readiness",
            "settings",
            "mining",
            "workers",
            "blocks",
        ):
            (
                part_status,
                _part_headers,
                part_data,
            ) = self._backend_get(
                f"/api/{name}"
            )

            part_payload = (
                self._decode_json_object(
                    part_data
                )
            )

            # Never hide a second independent backend failure.
            if (
                part_status != 200
                or part_payload is None
            ):
                return self._send_backend_response(
                    status,
                    headers,
                    data,
                )

            parts[name] = part_payload

        status_payload = dict(
            parts["status"]
        )

        node_payload = (
            status_payload.get("node")
        )

        if isinstance(node_payload, dict):
            for key in (
                "height",
                "estimated_height",
                "headers",
                "remaining_blocks",
                "sync_percent",
                "peers",
            ):
                if (
                    key not in status_payload
                    and key in node_payload
                ):
                    status_payload[key] = (
                        node_payload[key]
                    )

        readiness = dict(
            parts["readiness"]
        )

        checks = readiness.get(
            "checks"
        )

        if isinstance(checks, dict):
            for key in (
                "node_running",
                "rpc_ready",
                "chain_synced",
                "payout_configured",
                "stratum_online",
                "mining_engine_ready",
            ):
                if (
                    key not in readiness
                    and key in checks
                ):
                    readiness[key] = (
                        checks[key]
                    )

        payload = {
            "status":
                status_payload,
            "readiness":
                readiness,
            "settings":
                parts["settings"],
            "mining":
                parts["mining"],
            "workers":
                parts["workers"],
            "blocks":
                parts["blocks"],

            # Round/template telemetry is genuinely unavailable.
            # No ANOM-001 value is synthesized here.
            "round": {},
        }

        return self._send_json(
            200,
            payload,
            {
                "X-Kraskus-Overview-Compatibility":
                    "round-unavailable",
            },
        )

    def _proxy(self):
        length = int(
            self.headers.get(
                "Content-Length",
                "0",
            )
            or 0
        )

        body = (
            self.rfile.read(length)
            if length
            else None
        )

        headers = {}

        for key, value in self.headers.items():
            lower = key.lower()

            if lower in HOP_BY_HOP:
                continue

            if lower == "host":
                continue

            headers[key] = value

        headers["Host"] = (
            f"{BACKEND_HOST}:{BACKEND_PORT}"
        )

        connection = http.client.HTTPConnection(
            BACKEND_HOST,
            BACKEND_PORT,
            timeout=15,
        )

        try:
            connection.request(
                self.command,
                self.path,
                body=body,
                headers=headers,
            )

            response = connection.getresponse()
            data = response.read()

            self.send_response(response.status)

            for key, value in response.getheaders():
                lower = key.lower()

                if lower in HOP_BY_HOP:
                    continue

                if lower == "content-length":
                    continue

                self.send_header(key, value)

            self.send_header(
                "Content-Length",
                str(len(data)),
            )

            self.end_headers()

            if self.command != "HEAD":
                self.wfile.write(data)

        finally:
            connection.close()


if not STATIC.is_dir():
    raise SystemExit(
        f"static directory missing: {STATIC}"
    )


server = ThreadingHTTPServer(
    ("0.0.0.0", LISTEN_PORT),
    Handler,
)

print(
    f"CHTA_UI_GATEWAY_READY={LISTEN_PORT}",
    flush=True,
)

server.serve_forever()
