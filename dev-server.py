#!/usr/bin/env python3
"""Static dev server for this app: python3 dev-server.py [port]

Same as `python3 -m http.server`, but it tells the browser never to cache (so a page always loads the latest
scripts and styles after an edit, with no manual reload) and it stays quiet when the browser cancels a request
(reloading a page cancels the ones still loading, which makes the stock server print BrokenPipeError tracebacks).
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8000


class DevHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # the browser went away mid-download: nothing to report


class QuietServer(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        if isinstance(sys.exc_info()[1], (BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    print(f"Serving on http://localhost:{port}/ (no cache)")
    QuietServer(("", port), DevHandler).serve_forever()
