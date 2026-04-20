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

DEFAULT_PROVIDER = os.environ.get("AI_PROVIDER", "gemini").strip().lower()
GEMINI_MODEL = os.environ.get("GOOGLE_AI_MODEL", os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"))
DEEPSEEK_MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-reasoner")
GEMINI_BASE_URL = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta")
DEEPSEEK_BASE_URL = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
GEMINI_API_KEY = os.environ.get("GOOGLE_AI_API_KEY", os.environ.get("GEMINI_API_KEY", os.environ.get("GOOGLE_API_KEY")))
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY")


def ask_gemini(question: str, context: str, model: str | None = None, base_url: str | None = None, extra_parts: list[dict] | None = None) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("Missing GOOGLE_AI_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY")

    selected_model = (model or GEMINI_MODEL).strip() or GEMINI_MODEL
    selected_base_url = (base_url or GEMINI_BASE_URL).strip() or GEMINI_BASE_URL

    url = f"{selected_base_url.rstrip('/')}/models/{selected_model}:generateContent?key={GEMINI_API_KEY}"
    parts = [
        {
            "text": (
                "You are a concise Android Kotlin exam helper. "
                "Answer in Traditional Chinese or simple English when code is clearer. "
                "Prefer short, paste-ready code when appropriate.\n\n"
                f"Context:\n{context}"
            )
        }
    ]
    if extra_parts:
        parts.extend(extra_parts)
    parts.append({"text": f"Question:\n{question}"})

    payload = {
        "contents": [
            {
                "parts": parts
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
        raise RuntimeError(f"Gemini error {exc.code}: {body}") from exc

    parsed = json.loads(raw)
    candidates = parsed.get("candidates") or []
    if not candidates:
        raise RuntimeError("No candidates returned by Gemini")

    result_parts = candidates[0].get("content", {}).get("parts", [])
    texts = [part.get("text", "") for part in result_parts if part.get("text")]
    answer = "\n".join(texts).strip()
    if not answer:
        raise RuntimeError("Gemini returned an empty answer")
    return answer


def ask_deepseek(question: str, context: str, model: str | None = None, base_url: str | None = None, extra_parts: list[dict] | None = None) -> str:
    if not DEEPSEEK_API_KEY:
        raise RuntimeError("Missing DEEPSEEK_API_KEY")

    selected_model = (model or DEEPSEEK_MODEL).strip() or DEEPSEEK_MODEL
    selected_base_url = (base_url or DEEPSEEK_BASE_URL).strip() or DEEPSEEK_BASE_URL

    text_chunks: list[str] = []
    for part in extra_parts or []:
        text = part.get("text") if isinstance(part, dict) else None
        if text:
            text_chunks.append(str(text))

    user_content = "\n\n".join(text_chunks + [f"Question:\n{question}"])

    payload = {
        "model": selected_model,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a concise Android Kotlin exam helper. "
                    "Answer in Traditional Chinese or simple English when code is clearer. "
                    "Prefer short, paste-ready code when appropriate.\n\n"
                    f"Context:\n{context}"
                ),
            },
            {
                "role": "user",
                "content": user_content,
            },
        ],
    }
    data = json.dumps(payload).encode("utf-8")

    req = request.Request(
        f"{selected_base_url.rstrip('/')}/chat/completions",
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=60) as response:
            raw = response.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"DeepSeek error {exc.code}: {body}") from exc

    parsed = json.loads(raw)
    answer = (((parsed.get("choices") or [{}])[0].get("message") or {}).get("content") or "").strip()
    if not answer:
        raise RuntimeError("DeepSeek returned an empty answer")
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
                    "provider": DEFAULT_PROVIDER,
                    "gemini_model": GEMINI_MODEL,
                    "deepseek_model": DEEPSEEK_MODEL,
                    "gemini_configured": bool(GEMINI_API_KEY),
                    "deepseek_configured": bool(DEEPSEEK_API_KEY),
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
            provider = str(payload.get("provider", DEFAULT_PROVIDER)).strip().lower()
            provider = "deepseek" if provider == "deepseek" else "gemini"
            base_url = str(payload.get("base_url", "")).strip()
            model = str(payload.get("model", "")).strip()
            question = str(payload.get("question", "")).strip()
            context = str(payload.get("context", "")).strip()
            parts = payload.get("parts") or []
            if not question:
                raise ValueError("Missing question")
            if not isinstance(parts, list):
                raise ValueError("Invalid parts")

            if provider == "deepseek":
                answer = ask_deepseek(question, context, model=model, base_url=base_url, extra_parts=parts)
            else:
                answer = ask_gemini(question, context, model=model, base_url=base_url, extra_parts=parts)

            self._send_json({"answer": answer, "model": model or (DEEPSEEK_MODEL if provider == "deepseek" else GEMINI_MODEL), "provider": provider})
        except ValueError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)
        except RuntimeError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.BAD_GATEWAY)
        except Exception as exc:
            self._send_json({"error": f"Unexpected error: {exc}"}, HTTPStatus.INTERNAL_SERVER_ERROR)


def main() -> None:
    server = ThreadingHTTPServer((HOST, PORT), NotesHandler)
    print(f"Serving notes site at http://{HOST}:{PORT}")
    print(f"Default provider: {DEFAULT_PROVIDER}")
    print(f"Gemini configured: {bool(GEMINI_API_KEY)}")
    print(f"DeepSeek configured: {bool(DEEPSEEK_API_KEY)}")
    server.serve_forever()


if __name__ == "__main__":
    main()
