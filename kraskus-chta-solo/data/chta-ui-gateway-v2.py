from http.server import (
    SimpleHTTPRequestHandler,
    ThreadingHTTPServer,
)
from pathlib import Path
import http.client
import os
import urllib.parse


STATIC = Path("/app/ui/static")

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
        if self.path.startswith("/api/"):
            return self._proxy()

        parsed = urllib.parse.urlsplit(self.path)

        if parsed.path in ("", "/"):
            return self._serve_index()

        return super().do_GET()

    def _serve_index(self):
        index = STATIC / "index-bch.html"
        data = index.read_bytes()

        prefix = self.headers.get(
            "X-Forwarded-Prefix",
            "",
        ).rstrip("/")

        if prefix:
            text = data.decode("utf-8")

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
