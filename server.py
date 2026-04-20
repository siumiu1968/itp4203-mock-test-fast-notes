#!/usr/bin/env python3

from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request


ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("NOTES_SITE_HOST", "127.0.0.1")
PORT = int(os.environ.get("NOTES_SITE_PORT", "8000"))
MODEL = os.environ.get("GOOGLE_AI_MODEL", os.environ.get("GEMINI_MODEL", "gemma-4-26b-a4b-it"))
API_KEY = os.environ.get("GOOGLE_AI_API_KEY", os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY")))


def ask_google_ai(question: str, context: str, model: str | None = None) -> str:
    if not API_KEY:
      raise RuntimeError("Missing GOOGLE_AI_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY")

    selected_model = (model or MODEL).strip() or MODEL

    prompt = (
        "You are a concise Android Kotlin exam helper. "
        "Answer in Traditional Chinese or simple English when code is clearer. "
        "Prefer short, paste-ready code when appropriate.\n\n"
        f"Context:\n{context}\n\nQuestion:\n{question}"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{selected_model}:generateContent?key={API_KEY}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": prompt,
                    }
                ]
            }
        ]
    }
    data = json.dumps(payload).encode("utf-8")

    req = request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Google AI error {exc.code}: {body}") from exc

    parsed = json.loads(raw)
    candidates = parsed.get("candidates") or []
    if not candidates:
        raise RuntimeError("No candidates returned by Google AI")

    parts = candidates[0].get("content", {}).get("parts", [])
    texts = [part.get("text", "") for part in parts if part.get("text")]
    answer = "\n".join(texts).strip()
    if not answer:
        raise RuntimeError("Google AI returned an empty answer")
    return answer


class NotesHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json(
                {
                    "ok": True,
                    "model": MODEL,
                    "configured": bool(API_KEY),
                }
            )
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path != "/api/ask":
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)

        try:
            payload = json.loads(body.decode("utf-8"))
            model = str(payload.get("model", "")).strip()
            question = str(payload.get("question", "")).strip()
            context = str(payload.get("context", "")).strip()
            if not question:
                raise ValueError("Missing question")

            answer = ask_google_ai(question, context, model=model)
            self._send_json({"answer": answer, "model": model or MODEL})
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except RuntimeError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_GATEWAY)
        except Exception as exc:
            self._send_json({"error": f"Unexpected error: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), NotesHandler)
    print(f"Serving notes site at http://{HOST}:{PORT}")
    print(f"AI model: {MODEL}")
    print(f"AI configured: {bool(API_KEY)}")
    server.serve_forever()


if __name__ == "__main__":
    main()
