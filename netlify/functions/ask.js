const DEFAULT_PROVIDER = process.env.AI_PROVIDER || "gemini";
const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-reasoner";
const DEFAULT_GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const BUILT_IN_EXAM_CONTEXT = `
Course and exam background:
- The user is preparing for an ITP4203 Android Kotlin practical test. They are a beginner, so answers must assume near-zero Kotlin / Android Studio knowledge.
- The user may be using this during an allowed open-web / AI-assisted test. Treat it as urgent exam mode: give direct, copy-paste answers first, then only short explanation unless the user explicitly asks for detail.
- The mock test used for preparation is a Camera app: Android Kotlin app with Room database, RecyclerView start page, Insert page, image picker, Details page, Intent navigation, XML layouts, and basic Kotlin classes.
- The real test may be a variation of the mock test. Do not hardcode Camera if the prompt says Product / Task / Book / Contact / Student / Movie / any other entity. Map the same pattern to the new entity name and fields.

Known mock-test pattern:
- MainActivity / Start Page: display a list in RecyclerView, add button opens InsertActivity, tapping an item opens DetailsActivity.
- InsertActivity: EditText fields, Select Image button using ActivityResultContracts.GetContent, Save button creates an object and inserts into Room.
- DetailsActivity: receive an id through Intent extra, query Room by id, display name / description / image, Back button calls finish().
- Room files: Entity data class, Dao interface, AppDatabase singleton. For exam speed, allowMainThreadQueries() is acceptable if the question does not require ViewModel / coroutine.
- Default mock-test code style: use simple synchronous DAO methods such as List<T>, T?, and fun insertX(...). Do not use Flow, LiveData, suspend, Repository, ViewModel, or coroutines unless the user explicitly asks for Lab 4 architecture / MVVM / automatic updates.
- UUID can be stored as String using UUID.randomUUID().toString() to avoid Room TypeConverter complexity.
- imagePath should usually be stored as selectedImageUri?.toString() ?: "" and displayed by imageView.setImageURI(Uri.parse(imagePath)).
- Layout does not need pixel-perfect positioning unless the question explicitly requires it. Scoring usually checks required components and working behavior.

Course source map:
- Mobile Lab 1: basic Android UI, XML widgets, findViewById, button click events.
- Mobile Lab 2: Spinner, RecyclerView, Adapter, ViewHolder, list item XML.
- Mobile Lab 3: Intent, startActivity, putExtra / getExtra, DetailsActivity, fragments.
- Mobile Lab 4: Room API setup, KSP / Gradle dependencies, Entity, DAO, AppDatabase, Repository, ViewModel, LiveData / Flow, RecyclerView task list.
- Mobile Lab 5: Retrofit / API / network only if the question mentions server, API, HTTP, GET, POST, delete, or remote data.
- OOP lessons: Kotlin variables, functions, if / when / loops, class, constructor, private properties, data class, inheritance, interface, abstract class.

Answer rules:
- If the user asks what to do, output step-by-step file list with exact location: whole file, inside onCreate(), class level outside onCreate(), or XML layout file.
- If the user asks "改邊幾個檔案" / "which files" / "what files", only list files and one-line purpose first. Do not dump full code unless the user asks for code.
- If code is needed, output copy-ready code blocks. Include package/imports only when giving a whole file. For snippets, state where to paste them.
- If the user pastes an error, answer in this order: cause, exact file/line area to change, fixed code, one short reason.
- If the prompt is a variant, first identify the entity and fields, then generate Entity / Dao / Database / Adapter / Activity / XML using those names.
- Prefer simple working code over perfect architecture under time pressure. Mention if a shortcut is exam-only.
`.trim();

function getGeminiKeyPool() {
  const envEntries = Object.entries(process.env)
    .filter(([key, value]) => /^GEMINI_API_KEY(_\d+)?$/.test(key) && value)
    .sort(([left], [right]) => {
      const leftNum = Number.parseInt(left.split("_").pop(), 10);
      const rightNum = Number.parseInt(right.split("_").pop(), 10);
      const safeLeft = Number.isFinite(leftNum) ? leftNum : 1;
      const safeRight = Number.isFinite(rightNum) ? rightNum : 1;
      return safeLeft - safeRight;
    })
    .map(([, value]) => value.trim())
    .filter(Boolean);

  if (!envEntries.length && process.env.GOOGLE_AI_API_KEY) {
    envEntries.push(process.env.GOOGLE_AI_API_KEY.trim());
  }

  if (!envEntries.length && process.env.GOOGLE_API_KEY) {
    envEntries.push(process.env.GOOGLE_API_KEY.trim());
  }

  return envEntries;
}

function getDeepSeekKey() {
  return (process.env.DEEPSEEK_API_KEY || "").trim();
}

function shouldRotateKey(message) {
  return /429|quota|resource[_ ]?exhausted|rate|exceed|limit|too many|unavailable|high demand|spikes in demand|try again later/i.test(message);
}

function buildGeminiParts(question, context, extraParts) {
  return [
    {
      text:
        "You are a concise Android Kotlin exam helper. " +
        "Answer in Traditional Chinese or simple English when code is clearer. " +
        "Prefer short, paste-ready code when appropriate.\n\n" +
        `Built-in course context:\n${BUILT_IN_EXAM_CONTEXT}\n\nExtra runtime context:\n${context}`,
    },
    ...(Array.isArray(extraParts) ? extraParts : []),
    {
      text: `Question:\n${question}`,
    },
  ];
}

function buildDeepSeekMessages(question, context, extraParts) {
  const joined = (Array.isArray(extraParts) ? extraParts : [])
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n");

  const userContent = [joined, `Question:\n${question}`].filter(Boolean).join("\n\n");

  return [
    {
      role: "system",
      content:
        "You are a concise Android Kotlin exam helper. " +
        "Answer in Traditional Chinese or simple English when code is clearer. " +
        "Prefer short, paste-ready code when appropriate.\n\n" +
        `Built-in course context:\n${BUILT_IN_EXAM_CONTEXT}\n\nExtra runtime context:\n${context}`,
    },
    {
      role: "user",
      content: userContent,
    },
  ];
}

async function askGeminiWithKey({ apiKey, model, question, context, parts, baseUrl }) {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-api-client": "itp4203-notes-site-netlify/1.0",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: buildGeminiParts(question, context, parts),
          },
        ],
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Gemini request failed (${response.status})`);
  }

  const answer =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!answer) {
    throw new Error("Gemini 沒有回覆內容");
  }

  return answer;
}

async function askDeepSeek({ apiKey, model, question, context, parts, baseUrl }) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: buildDeepSeekMessages(question, context, parts),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `DeepSeek request failed (${response.status})`);
  }

  const message = payload.choices?.[0]?.message || {};
  const answer = (message.content || "").trim();
  if (!answer) {
    throw new Error("DeepSeek 沒有回覆內容");
  }

  return answer;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const provider = String(payload.provider || DEFAULT_PROVIDER).trim().toLowerCase() === "deepseek" ? "deepseek" : "gemini";
    const question = String(payload.question || "").trim();
    const context = String(payload.context || "").trim();
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    const model = String(
      payload.model || (provider === "deepseek" ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_GEMINI_MODEL)
    ).trim();
    const baseUrl = String(
      payload.base_url || (provider === "deepseek" ? DEFAULT_DEEPSEEK_BASE_URL : DEFAULT_GEMINI_BASE_URL)
    ).trim();

    if (!question) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing question" }),
      };
    }

    if (provider === "deepseek") {
      const apiKey = getDeepSeekKey();
      if (!apiKey) {
        return {
          statusCode: 502,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ error: "No DeepSeek API key configured on Netlify" }),
        };
      }

      const answer = await askDeepSeek({ apiKey, model, question, context, parts, baseUrl });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ answer, model, provider }),
      };
    }

    const keyPool = getGeminiKeyPool();
    if (!keyPool.length) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "No Gemini API keys configured on Netlify" }),
      };
    }

    let lastError;
    for (const apiKey of keyPool) {
      try {
        const answer = await askGeminiWithKey({ apiKey, model, question, context, parts, baseUrl });
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ answer, model, provider }),
        };
      } catch (error) {
        lastError = error;
        if (!shouldRotateKey(error.message)) {
          break;
        }
      }
    }

    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: lastError?.message || "All Gemini keys failed" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ error: `Unexpected error: ${error.message}` }),
    };
  }
};
