"""A local HTTP server that imitates Anthropic, OpenAI-compatible and Ollama APIs."""
from __future__ import annotations

import json
import threading
from collections import defaultdict
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

OLLAMA_TAGS = {"models": [
    {"name": "llama3.2:3b", "details": {"parameter_size": "3.2B"}},
    {"name": "qwen2.5-coder:7b", "details": {"parameter_size": "7.6B"}},
    {"name": "nomic-embed-text:latest", "details": {"parameter_size": "137M"}},
]}


def openai_ok(provider, model):
    return 200, {"choices": [{"message": {"content": f"hello from {provider}/{model}"},
                              "finish_reason": "stop"}],
                 "usage": {"prompt_tokens": 10, "completion_tokens": 5}}, {}


def anthropic_ok(model):
    return 200, {"type": "message", "content": [{"type": "text", "text": f"hello from anthropic/{model}"}],
                 "stop_reason": "end_turn", "usage": {"input_tokens": 10, "output_tokens": 5}}, {}


class FakeAPI:
    def __init__(self):
        self.queues: dict[str, list] = defaultdict(list)   # provider -> scripted responses
        self.always: dict[str, tuple] = {}                  # provider -> sticky response
        self.hits: dict[str, int] = defaultdict(int)
        self.requests: list[dict] = []
        self.ollama_up = True
        api = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def _send(self, status, body, headers=None):
                raw = json.dumps(body).encode()
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                for k, v in (headers or {}).items():
                    self.send_header(k, str(v))
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def _handle(self, method):
                parts = self.path.strip("/").split("/")
                provider, rest = parts[0], "/".join(parts[1:])
                length = int(self.headers.get("Content-Length") or 0)
                body = json.loads(self.rfile.read(length) or b"{}") if length else {}
                api.requests.append({"provider": provider, "path": rest, "body": body,
                                     "headers": dict(self.headers)})
                if provider == "ollama" and not api.ollama_up:
                    self.close_connection = True
                    self._send(503, {"error": "down"})
                    return
                if provider == "ollama" and rest == "api/tags":
                    return self._send(200, OLLAMA_TAGS)
                if provider == "ollama" and rest == "api/version":
                    return self._send(200, {"version": "0.0-test"})
                if rest.endswith("models") and method == "GET" or "models?" in rest:
                    return self._send(200, {"data": [{"id": "test-model"}]})
                api.hits[provider] += 1
                model = body.get("model", "?")
                if api.queues[provider]:
                    resp = api.queues[provider].pop(0)
                elif provider in api.always:
                    resp = api.always[provider]
                elif provider == "anthropic":
                    resp = anthropic_ok(model)
                else:
                    resp = openai_ok(provider, model)
                if callable(resp):
                    resp = resp(body, dict(self.headers))
                self._send(*resp)

            def do_GET(self):
                self._handle("GET")

            def do_POST(self):
                self._handle("POST")

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.server.server_address[1]}"
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def start(self):
        self.thread.start()
        return self

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

    def reset(self):
        self.queues.clear()
        self.always.clear()
        self.hits.clear()
        self.requests.clear()
        self.ollama_up = True
