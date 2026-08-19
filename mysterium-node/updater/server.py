#!/usr/bin/env python3
import os
import subprocess
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = "/opt/updater/www/cgi-bin"
ROUTES = {
    ("GET", "/cgi-bin/status"): os.path.join(ROOT, "status"),
    ("POST", "/cgi-bin/update"): os.path.join(ROOT, "update"),
}


def parse_cgi_output(raw: bytes):
    head, sep, body = raw.partition(b"\r\n\r\n")
    if not sep:
        head, sep, body = raw.partition(b"\n\n")
    status = 200
    headers = []
    for line in head.replace(b"\r\n", b"\n").split(b"\n"):
        if not line or b":" not in line:
            continue
        key, value = line.split(b":", 1)
        key_s = key.decode("latin-1").strip()
        value_s = value.decode("latin-1").strip()
        if key_s.lower() == "status":
            try:
                status = int(value_s.split()[0])
            except (ValueError, IndexError):
                status = 500
        else:
            headers.append((key_s, value_s))
    return status, headers, body


class Handler(BaseHTTPRequestHandler):
    server_version = "MystNodesUpdater/2.5.0"

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)

    def _run(self):
        route = ROUTES.get((self.command, self.path.split("?", 1)[0]))
        if not route:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"not found"}\n')
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        body = self.rfile.read(length) if length else b""
        env = os.environ.copy()
        env.update({
            "REQUEST_METHOD": self.command,
            "CONTENT_LENGTH": str(len(body)),
            "CONTENT_TYPE": self.headers.get("Content-Type", ""),
            "QUERY_STRING": self.path.partition("?")[2],
        })
        try:
            result = subprocess.run(
                ["/bin/sh", route],
                input=body,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env,
                timeout=30,
                check=False,
            )
        except subprocess.TimeoutExpired:
            self.send_response(504)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":false,"error":"updater request timed out"}\n')
            return

        if result.stderr:
            print(result.stderr.decode("utf-8", "replace"), flush=True)

        status, headers, response_body = parse_cgi_output(result.stdout)
        self.send_response(status)
        sent_type = False
        for key, value in headers:
            if key.lower() == "content-type":
                sent_type = True
            self.send_header(key, value)
        if not sent_type:
            self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(response_body)

    def do_GET(self):
        self._run()

    def do_POST(self):
        self._run()


if __name__ == "__main__":
    host = os.environ.get("UPDATE_LISTEN", "0.0.0.0")
    port = int(os.environ.get("UPDATE_PORT", "33062"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
