const DEFAULT_MODEL = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DIRECT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getKeyPool() {
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

function shouldRotateKey(message) {
  return /429|quota|resource[_ ]?exhausted|rate|exceed|limit|too many|unavailable/i.test(message);
}

function buildParts(question, context, extraParts) {
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

async function askWithKey({ apiKey, model, question, context, parts }) {
  const response = await fetch(
    `${DIRECT_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
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
            parts: buildParts(question, context, parts),
          },
        ],
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `Google AI request failed (${response.status})`);
  }

  const answer =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim() || "";

  if (!answer) {
    throw new Error("Google AI 沒有回覆內容");
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
    const question = String(payload.question || "").trim();
    const context = String(payload.context || "").trim();
    const parts = Array.isArray(payload.parts) ? payload.parts : [];
    const model = String(payload.model || DEFAULT_MODEL).trim() || DEFAULT_MODEL;

    if (!question) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Missing question" }),
      };
    }

    const keyPool = getKeyPool();
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
        const answer = await askWithKey({ apiKey, model, question, context, parts });
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ answer, model }),
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
