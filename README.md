# Notes Site

## What This Is

This folder contains a static website for the Android mock test:

- official Android / Kotlin links that match the mock test tasks
- copy-ready short code blocks
- downloadable full mock answer files bundled into `./files`
- an optional AI panel

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

## Enable AI Safely

There are 2 AI modes now:

1. Public static mode: paste your own Google AI key into the website UI. The key stays in that browser only.
2. Local proxy mode: keep the key on the server side with environment variables.

Do **not** hardcode the API key into front-end JavaScript.

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

You can also override the model directly in the website UI by typing a model code into the `模型代號` field before sending a question.

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
