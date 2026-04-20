const DEFAULT_PROVIDER = process.env.AI_PROVIDER || "gemini";
const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-reasoner";
const DEFAULT_GEMINI_BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

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
  return /429|quota|resource[_ ]?exhausted|rate|exceed|limit|too many|unavailable/i.test(message);
}

function buildGeminiParts(question, context, extraParts) {
  return [
    {
      text:
        "You are a concise Android Kotlin exam helper. " +
        "Answer in Traditional Chinese or simple English when code is clearer. " +
        "Prefer short, paste-ready code when appropriate.\n\n" +
        `Context:\n${context}`,
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
        `Context:\n${context}`,
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
