const searchInput = document.getElementById("resourceSearch");
const resourceCards = [...document.querySelectorAll(".resource-card")];
const copyButtons = [...document.querySelectorAll(".copy-button")];

const hiddenAiTrigger = document.getElementById("hiddenAiTrigger");
const aiModal = document.getElementById("aiModal");
const closeAiModal = document.getElementById("closeAiModal");
const aiConfigModal = document.getElementById("aiConfigModal");
const closeAiConfig = document.getElementById("closeAiConfig");
const saveAiConfig = document.getElementById("saveAiConfig");

const askAiButton = document.getElementById("askAiButton");
const aiStatus = document.getElementById("aiStatus");
const aiQuestion = document.getElementById("aiQuestion");
const aiAnswer = document.getElementById("aiAnswer");
const aiFileInput = document.getElementById("aiFileInput");
const aiFileList = document.getElementById("aiFileList");
const aiKeyPool = document.getElementById("aiKeyPool");
const aiHiddenModel = document.getElementById("aiHiddenModel");

const localBaseUrl = new URL(".", window.location.href);
const localHealthUrl = new URL("api/health", localBaseUrl);
const localAskUrl = new URL("api/ask", localBaseUrl);

const DEFAULT_MODEL = "gemini-2.5-flash";
const AI_KEY_POOL_STORAGE = "itp4203_gemini_key_pool";
const AI_MODEL_STORAGE = "itp4203_hidden_model";
const AI_ACTIVE_KEY_INDEX_STORAGE = "itp4203_active_key_index";
const MAX_TEXT_CHARS = 120000;
const MAX_FILE_BYTES = 18 * 1024 * 1024;

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

function setAiStatus(text, className = "") {
  if (!aiStatus) return;
  aiStatus.textContent = text;
  aiStatus.classList.remove("status-ready", "status-error");
  if (className) {
    aiStatus.classList.add(className);
  }
}

function openModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
}

function parseKeyPool(raw) {
  return raw
    .split(/[\n,]+/)
    .map((key) => key.trim())
    .filter(Boolean);
}

function getStoredKeyPool() {
  return parseKeyPool(window.localStorage.getItem(AI_KEY_POOL_STORAGE) || "");
}

function getStoredModel() {
  return (window.localStorage.getItem(AI_MODEL_STORAGE) || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function getActiveKeyIndex(poolLength) {
  const value = Number.parseInt(window.localStorage.getItem(AI_ACTIVE_KEY_INDEX_STORAGE) || "0", 10);
  if (!Number.isFinite(value) || value < 0 || poolLength <= 0) {
    return 0;
  }
  return value % poolLength;
}

function saveConfig() {
  if (aiKeyPool) {
    const value = aiKeyPool.value.trim();
    if (value) {
      window.localStorage.setItem(AI_KEY_POOL_STORAGE, value);
    } else {
      window.localStorage.removeItem(AI_KEY_POOL_STORAGE);
    }
  }

  if (aiHiddenModel) {
    const value = aiHiddenModel.value.trim() || DEFAULT_MODEL;
    window.localStorage.setItem(AI_MODEL_STORAGE, value);
  }

  window.localStorage.setItem(AI_ACTIVE_KEY_INDEX_STORAGE, "0");
  pingAi();
}

function loadConfig() {
  if (aiKeyPool) {
    aiKeyPool.value = window.localStorage.getItem(AI_KEY_POOL_STORAGE) || "";
  }

  if (aiHiddenModel) {
    aiHiddenModel.value = getStoredModel();
  }
}

function shouldRotateKey(message) {
  return /429|quota|resource[_ ]?exhausted|rate|exceed|limit|too many|unavailable/i.test(message);
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&quot;";
  });
}

function renderSelectedFiles() {
  if (!aiFileList || !aiFileInput) return;
  const files = [...(aiFileInput.files || [])];
  if (!files.length) {
    aiFileList.innerHTML = "";
    return;
  }

  aiFileList.innerHTML = files
    .map((file) => `<span class="upload-pill">${escapeHtml(file.name)}</span>`)
    .join("");
}

function normalizeExtension(fileName) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isTextLike(file, ext) {
  const type = file.type || "";
  if (type.startsWith("text/")) return true;
  return [
    "kt",
    "kts",
    "java",
    "xml",
    "json",
    "md",
    "txt",
    "csv",
    "gradle",
    "properties",
    "html",
    "css",
    "js",
    "ts",
    "yml",
    "yaml",
  ].includes(ext);
}

function isInlineMedia(file, ext) {
  const type = file.type || "";
  return type.startsWith("image/") || type === "application/pdf" || ["png", "jpg", "jpeg", "webp", "gif", "pdf"].includes(ext);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

async function extractDocxText(file) {
  if (!window.JSZip) {
    throw new Error("JSZip 尚未載入");
  }

  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const mainDoc = zip.file("word/document.xml");
  if (!mainDoc) {
    throw new Error("讀唔到 docx 內容");
  }

  const xmlText = await mainDoc.async("string");
  const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
  const chunks = [...documentNode.getElementsByTagName("w:t")]
    .map((node) => node.textContent || "")
    .filter(Boolean);
  return chunks.join(" ");
}

async function extractPptxText(file) {
  if (!window.JSZip) {
    throw new Error("JSZip 尚未載入");
  }

  const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((left, right) => {
      const leftNum = Number.parseInt(left.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      const rightNum = Number.parseInt(right.match(/slide(\d+)\.xml/i)?.[1] || "0", 10);
      return leftNum - rightNum;
    });

  if (!slidePaths.length) {
    throw new Error("讀唔到 pptx slides");
  }

  const slideChunks = [];
  for (const path of slidePaths) {
    const xmlText = await zip.file(path).async("string");
    const documentNode = new DOMParser().parseFromString(xmlText, "application/xml");
    const texts = [...documentNode.getElementsByTagName("a:t")]
      .map((node) => node.textContent || "")
      .filter(Boolean);
    if (texts.length) {
      const slideNo = path.match(/slide(\d+)\.xml/i)?.[1] || "?";
      slideChunks.push(`Slide ${slideNo}: ${texts.join(" ")}`);
    }
  }

  return slideChunks.join("\n\n");
}

function trimText(text) {
  if (text.length <= MAX_TEXT_CHARS) {
    return text;
  }
  return `${text.slice(0, MAX_TEXT_CHARS)}\n\n[內容過長，已截短]`;
}

async function buildFileParts(files) {
  const parts = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      parts.push({
        text: `附加檔案 ${file.name} 太大，已跳過。請改用較細文件或先壓縮內容。`,
      });
      continue;
    }

    const ext = normalizeExtension(file.name);

    if (isInlineMedia(file, ext)) {
      const buffer = await file.arrayBuffer();
      const mimeType = file.type || (ext === "pdf" ? "application/pdf" : "image/png");
      parts.push({ text: `Attached file: ${file.name}` });
      parts.push({
        inlineData: {
          mimeType,
          data: arrayBufferToBase64(buffer),
        },
      });
      continue;
    }

    if (ext === "docx") {
      const text = trimText(await extractDocxText(file));
      parts.push({ text: `Attached DOCX ${file.name}:\n${text}` });
      continue;
    }

    if (ext === "pptx") {
      const text = trimText(await extractPptxText(file));
      parts.push({ text: `Attached PPTX ${file.name}:\n${text}` });
      continue;
    }

    if (isTextLike(file, ext)) {
      const text = trimText(await file.text());
      parts.push({ text: `Attached file ${file.name}:\n${text}` });
      continue;
    }

    parts.push({
      text: `附加檔案 ${file.name} 屬於未完整支援格式。你可以改用 PDF、圖片、txt、kt、xml、docx 或 pptx。`,
    });
  }

  return parts;
}

function buildUserParts(question, context, fileParts) {
  return [
    {
      text:
        "You are a concise Android Kotlin exam helper. " +
        "Answer in Traditional Chinese or simple English when code is clearer. " +
        "Prefer short, paste-ready code when appropriate.\n\n" +
        `Context:\n${context}`,
    },
    ...fileParts,
    {
      text: `Question:\n${question}`,
    },
  ];
}

async function askGoogleDirect(question, context, model, apiKey, fileParts) {
  const selectedModel = model || DEFAULT_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(selectedModel)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
        "x-goog-api-client": "itp4203-notes-site/1.0",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: buildUserParts(question, context, fileParts),
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

async function askWithKeyPool(question, context, fileParts) {
  const keyPool = getStoredKeyPool();
  if (!keyPool.length) {
    throw new Error("未設定 key pool");
  }

  const model = getStoredModel();
  let lastError = null;
  const startIndex = getActiveKeyIndex(keyPool.length);

  for (let offset = 0; offset < keyPool.length; offset += 1) {
    const index = (startIndex + offset) % keyPool.length;
    const key = keyPool[index];

    try {
      const answer = await askGoogleDirect(question, context, model, key, fileParts);
      window.localStorage.setItem(AI_ACTIVE_KEY_INDEX_STORAGE, String(index));
      return answer;
    } catch (error) {
      lastError = error;
      if (!shouldRotateKey(error.message)) {
        throw error;
      }
    }
  }

  throw lastError || new Error("全部 key 都未能使用");
}

async function askLocalProxy(question, context, fileParts) {
  const response = await fetch(localAskUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getStoredModel(),
      question,
      context,
      parts: fileParts,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "AI request failed");
  }

  return payload.answer || "AI 沒有回覆內容。";
}

async function pingAi() {
  if (getStoredKeyPool().length) {
    setAiStatus("已就緒", "status-ready");
    return;
  }

  try {
    const response = await fetch(localHealthUrl);
    if (!response.ok) throw new Error("not ready");
    const payload = await response.json();
    if (payload.configured) {
      setAiStatus("本機", "status-ready");
      return;
    }
  } catch (error) {
    // ignore
  }

  setAiStatus("未設置");
}

if (hiddenAiTrigger) {
  hiddenAiTrigger.addEventListener("click", () => {
    openModal(aiModal);
    aiQuestion?.focus();
  });

  hiddenAiTrigger.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openModal(aiConfigModal);
    aiKeyPool?.focus();
  });
}

if (closeAiModal) {
  closeAiModal.addEventListener("click", () => {
    closeModal(aiModal);
  });
}

if (closeAiConfig) {
  closeAiConfig.addEventListener("click", () => {
    closeModal(aiConfigModal);
  });
}

if (aiModal) {
  aiModal.addEventListener("click", (event) => {
    if (event.target === aiModal) {
      closeModal(aiModal);
    }
  });
}

if (aiConfigModal) {
  aiConfigModal.addEventListener("click", (event) => {
    if (event.target === aiConfigModal) {
      closeModal(aiConfigModal);
    }
  });
}

if (saveAiConfig) {
  saveAiConfig.addEventListener("click", () => {
    saveConfig();
    closeModal(aiConfigModal);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal(aiModal);
    closeModal(aiConfigModal);
  }

  if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openModal(aiConfigModal);
    aiKeyPool?.focus();
  }
});

if (aiFileInput) {
  aiFileInput.addEventListener("change", () => {
    renderSelectedFiles();
  });
}

if (askAiButton) {
  askAiButton.addEventListener("click", async () => {
    const question = aiQuestion?.value?.trim() || "";
    const context =
      "You are answering questions about an Android Kotlin mock test with Room, RecyclerView, Intent, Image picker, XML layouts, and beginner-level Kotlin explanations. Keep answers concise, clear, and paste-ready.";

    if (!question) {
      aiAnswer.textContent = "請先輸入問題。";
      return;
    }

    setAiStatus("思考中");
    aiAnswer.textContent = "處理中...";

    try {
      const files = [...(aiFileInput?.files || [])];
      const fileParts = await buildFileParts(files);

      if (getStoredKeyPool().length) {
        aiAnswer.textContent = await askWithKeyPool(question, context, fileParts);
      } else {
        aiAnswer.textContent = await askLocalProxy(question, context, fileParts);
      }

      setAiStatus("已完成", "status-ready");
    } catch (error) {
      aiAnswer.textContent =
        `AI 未能使用：${error.message}\n\n` +
        "隱藏設定：按 Ctrl + Alt + K，貼入 key pool。quota 用完會自動轉下一條。";
      setAiStatus("出錯", "status-error");
    }
  });
}

loadConfig();
renderSelectedFiles();
pingAi();
