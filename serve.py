"""Tiny local server for Glimmerfold that tells the browser never to cache, so edits show up on refresh."""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    # one thread per request, so the page's many module files load in parallel without dropped connections
    daemon_threads = True
    allow_reuse_address = True
    request_queue_size = 64


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"Glimmerfold on http://localhost:{PORT}")
    httpd.serve_forever()
