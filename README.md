# Notes Site

## What This Is

This folder contains a static website for the Android mock test:

- official Android / Kotlin links that match the mock test tasks
- copy-ready short code blocks
- downloadable full mock answer files bundled into `./files`
- a hidden AI helper with file upload

## Open The Site

You can open `index.html` directly.

If you want the local proxy version of the AI panel, run:

```bash
cd /Volumes/ORICO/ITP4203_Android_Kotlin/notes_site
python3 server.py
```

Then open:

```text
http://127.0.0.1:8000
```

## Hidden AI Helper

The public page no longer shows a visible AI section.

- Hidden entry: click the tiny blank spot at the bottom-right corner.
- Hidden settings: right-click that blank spot, or press `Ctrl + Alt + K`.
- Visible helper UI only shows:
  - question box
  - file upload
  - blank send button
  - answer area

## Enable AI Safely

There are 2 AI modes now:

1. Public static mode: store a Gemini key pool in hidden settings. The pool stays in that browser via `localStorage`, and the site auto-rotates to the next key when quota errors happen.
2. Local proxy mode: keep the key on the server side with environment variables.

Do **not** hardcode the API key pool into public front-end JavaScript.

Set one of these environment variables before running the server:

```bash
export GOOGLE_AI_API_KEY="your_key_here"
export GOOGLE_AI_MODEL="gemma-4-26b-a4b-it"
python3 server.py
```

Supported env names for the key:

- `GOOGLE_AI_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_API_KEY`

Supported env names for the model:

- `GOOGLE_AI_MODEL`
- `GEMINI_MODEL`

You can also override the hidden model in the hidden settings panel.

## Public Deployment

The static files can be deployed to GitHub Pages / Netlify / Vercel.

This folder is now self-contained for public hosting:

- `index.html`, `styles.css`, `app.js`
- `files/mock_test_answer.zip`
- `files/mock_test_answer/*.kt`
- `files/mock_test_answer/*.xml`
- `files/MOCK_TEST_CHEATSHEET.md`
- `files/ITP4203_Mock_Test_Answer_and_Explanation.docx`

For GitHub Pages, the AI panel can still work in browser-key mode. The local proxy path only works when `server.py` is running on your own machine.
