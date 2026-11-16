"""Local production-output server with clean URLs and real 404s; Vercel is tested separately."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parts = urlsplit(self.path)
        path = parts.path
        if path != '/' and (path.endswith('/') or path.endswith('.html')):
            target = path.rstrip('/') if path.endswith('/') else path[:-5]
            self.send_response(308)
            self.send_header('Location', target + ('?' + parts.query if parts.query else ''))
            self.end_headers()
            return
        if path == '/search':
            self.path = '/search.html'
        elif path != '/' and not Path(self.translate_path(path)).is_file():
            self.path = path + '.html'
        super().do_GET()

    def end_headers(self):
        if urlsplit(self.path).path in ['/search', '/search.html']:
            self.send_header('X-Robots-Tag', 'noindex')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code != 404:
            return super().send_error(code, message, explain)
        body = Path(self.directory, '404.html').read_bytes()
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8080)
    parser.add_argument('--directory', default='dist')
    args = parser.parse_args()
    ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=args.directory)).serve_forever()
