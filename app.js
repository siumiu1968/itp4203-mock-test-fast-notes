const searchInput = document.getElementById("resourceSearch");
const resourceCards = [...document.querySelectorAll(".resource-card")];
const copyButtons = [...document.querySelectorAll(".copy-button")];
const askAiButton = document.getElementById("askAiButton");
const aiStatus = document.getElementById("aiStatus");
const aiApiKey = document.getElementById("aiApiKey");
const aiModel = document.getElementById("aiModel");
const aiQuestion = document.getElementById("aiQuestion");
const aiAnswer = document.getElementById("aiAnswer");
const localBaseUrl = new URL(".", window.location.href);
const localHealthUrl = new URL("api/health", localBaseUrl);
const localAskUrl = new URL("api/ask", localBaseUrl);
const DEFAULT_MODEL = "gemma-4-26b-a4b-it";
const AI_KEY_STORAGE = "itp4203_google_ai_key";
const AI_MODEL_STORAGE = "itp4203_google_ai_model";

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();
    resourceCards.forEach((card) => {
      const haystack = `${card.textContent} ${card.dataset.tags || ""}`.toLowerCase();
      card.style.display = haystack.includes(keyword) ? "" : "none";
    });
  });
}

copyButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const targetId = button.dataset.copyTarget;
    const target = document.getElementById(targetId);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.innerText);
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    } catch (error) {
      button.textContent = "Copy failed";
      setTimeout(() => {
        button.textContent = "Copy";
      }, 1200);
    }
  });
});

if (aiApiKey) {
  const savedKey = window.localStorage.getItem(AI_KEY_STORAGE);
  if (savedKey && !aiApiKey.value) {
    aiApiKey.value = savedKey;
  }

  aiApiKey.addEventListener("input", () => {
    const value = aiApiKey.value.trim();
    if (value) {
      window.localStorage.setItem(AI_KEY_STORAGE, value);
    } else {
      window.localStorage.removeItem(AI_KEY_STORAGE);
    }
    pingAi();
  });
}

if (aiModel) {
  const savedModel = window.localStorage.getItem(AI_MODEL_STORAGE);
  if (savedModel && !aiModel.value) {
    aiModel.value = savedModel;
  }

  aiModel.addEventListener("input", () => {
    const value = aiModel.value.trim();
    if (value) {
      window.localStorage.setItem(AI_MODEL_STORAGE, value);
    } else {
      window.localStorage.removeItem(AI_MODEL_STORAGE);
    }
  });
}

function setAiStatus(text, className = "") {
  aiStatus.textContent = text;
  aiStatus.classList.remove("status-ready", "status-error");
  if (className) {
    aiStatus.classList.add(className);
  }
}

function buildPrompt(question, context) {
  return (
    "You are a concise Android Kotlin exam helper. " +
    "Answer in Traditional Chinese or simple English when code is clearer. " +
    "Prefer short, paste-ready code when appropriate.\n\n" +
    `Context:\n${context}\n\nQuestion:\n${question}`
  );
}

async function askGoogleDirect(question, context, model, apiKey) {
  const selectedModel = model || DEFAULT_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildPrompt(question, context),
              },
            ],
          },
        ],
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || "Google AI request failed");
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

async function askLocalProxy(question, context, model) {
  const response = await fetch(localAskUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      question,
      context,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "AI request failed");
  }

  return payload.answer || "AI 沒有回覆內容。";
}

async function pingAi() {
  const browserKey = aiApiKey?.value?.trim();
  if (browserKey) {
    setAiStatus("瀏覽器 Key", "status-ready");
    return;
  }

  try {
    const response = await fetch(localHealthUrl);
    if (!response.ok) throw new Error("not ready");
    const payload = await response.json();
    if (payload.configured) {
      setAiStatus("本地 Proxy", "status-ready");
      return;
    }

    setAiStatus("未設 Key");
  } catch (error) {
    setAiStatus("未連接");
  }
}

if (askAiButton) {
  askAiButton.addEventListener("click", async () => {
    const question = aiQuestion.value.trim();
    const model = aiModel?.value?.trim() || DEFAULT_MODEL;
    const browserKey = aiApiKey?.value?.trim();
    const context =
      "You are answering questions about an Android Kotlin mock test with Room, RecyclerView, Intent, Image picker, and basic XML layouts. Keep answers concise and paste-ready.";

    if (!question) {
      aiAnswer.textContent = "請先輸入問題。";
      return;
    }

    setAiStatus("思考中");

    try {
      if (browserKey) {
        aiAnswer.textContent = await askGoogleDirect(question, context, model, browserKey);
      } else {
        aiAnswer.textContent = await askLocalProxy(question, context, model);
      }

      setAiStatus("已完成", "status-ready");
    } catch (error) {
      aiAnswer.textContent =
        `AI 未能使用：${error.message}\n\n` +
        "公開版建議直接貼你自己嘅 Google AI key；如果你想靠本地 proxy，就要先啟動 notes_site/server.py。";
      setAiStatus("出錯", "status-error");
    }
  });
}

pingAi();
