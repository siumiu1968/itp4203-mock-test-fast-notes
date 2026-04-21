const searchInput = document.getElementById("resourceSearch");
const resourceCards = [...document.querySelectorAll(".resource-card")];
const copyButtons = [...document.querySelectorAll(".copy-button")];

const hiddenAiTrigger = document.getElementById("hiddenAiTrigger");
const aiModal = document.getElementById("aiModal");
const closeAiModal = document.getElementById("closeAiModal");
const panicHideStrip = document.getElementById("panicHideStrip");
const aiConfigModal = document.getElementById("aiConfigModal");
const closeAiConfig = document.getElementById("closeAiConfig");
const saveAiConfig = document.getElementById("saveAiConfig");

const askAiButton = document.getElementById("askAiButton");
const aiStatus = document.getElementById("aiStatus");
const aiQuestion = document.getElementById("aiQuestion");
const aiFileInput = document.getElementById("aiFileInput");
const aiFileList = document.getElementById("aiFileList");
const aiProvider = document.getElementById("aiProvider");
const aiBaseUrl = document.getElementById("aiBaseUrl");
const aiKeyPool = document.getElementById("aiKeyPool");
const aiDeepSeekKey = document.getElementById("aiDeepSeekKey");
const aiHiddenModel = document.getElementById("aiHiddenModel");
const chatProviderSelect = document.getElementById("chatProviderSelect");
const chatHistory = document.getElementById("chatHistory");
const promptChips = [...document.querySelectorAll(".prompt-chip")];

const localBaseUrl = new URL(".", window.location.href);
const localHealthUrl = new URL("api/health", localBaseUrl);
const localAskUrl = new URL("api/ask", localBaseUrl);
const netlifyAskUrl = new URL("/.netlify/functions/ask", window.location.origin);

const DEFAULT_PROVIDER = "gemini";
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const AI_KEY_POOL_STORAGE = "itp4203_gemini_key_pool";
const AI_PROVIDER_STORAGE = "itp4203_hidden_provider";
const AI_BASE_URL_STORAGE = "itp4203_hidden_base_url";
const AI_DEEPSEEK_KEY_STORAGE = "itp4203_hidden_deepseek_key";
const AI_MODEL_STORAGE = "itp4203_hidden_model";
const AI_ACTIVE_KEY_INDEX_STORAGE = "itp4203_active_key_index";
const CHAT_HISTORY_STORAGE = "itp4203_hidden_chat_history_v1";
const MAX_TEXT_CHARS = 120000;
const MAX_FILE_BYTES = 18 * 1024 * 1024;
const MAX_CHAT_MESSAGES = 40;
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

const PROMPT_TEMPLATES = {
  line_by_line:
    "考試急用。請直接輸出答案，優先俾可 copy code。只在必要時用最多 3 句解釋。幫我逐行指出下面 code 每行做咩：\n\n[貼上唔明嘅 code / 題目 / 內容]",
  button_meaning:
    "考試急用。請直接講呢個元件 / button 要寫喺邊個 XML、邊個 Kotlin 檔案處理，然後俾最短可 copy code。唔好長篇解釋：\n\n[貼上元件名 / code / 題目]",
  fix_error:
    "考試急用。請直接指出錯喺邊，然後俾我最短修正 code / 要改嘅行。解釋最多 3 句：\n\n[貼上 error message / 截圖文字 / code]",
  room_setup:
    "考試急用。我要喺 Android Studio 加 Room API。請直接列出要改邊幾個檔案，並輸出可 copy 嘅 libs.versions.toml、Project build.gradle.kts、Module build.gradle.kts、dependencies、gradle.properties。解釋最多 3 句：\n\n[貼上我而家嘅 Gradle / error / 題目]",
  room_answer:
    "考試急用。請根據下面要求，直接輸出最短可 copy Room 答案。要包括 Entity、Dao、Database；如果需要先加 imports。解釋最多 3 句：\n\n[貼上題目 / 要求]",
  recycler_answer:
    "考試急用。請根據下面要求，直接輸出最短可 copy RecyclerView 答案。要包括 Adapter、ViewHolder、item layout、Activity set adapter。解釋最多 3 句：\n\n[貼上題目 / 要求]",
  intent_answer:
    "考試急用。請直接輸出最短可 copy Intent 跳頁答案。分 send page 同 receive page，包含 putExtra / getStringExtra / startActivity：\n\n[貼上題目 / 要求]",
  image_picker:
    "考試急用。請直接輸出最短可 copy Select Image / image picker 答案。要包括開相簿、顯示預覽、儲存 URI：\n\n[貼上題目 / 要求]",
  xml_layout:
    "考試急用。請根據下面要求直接輸出最簡單可 copy XML layout。唔需要靚，只要元件齊、id 清楚、容易接 Kotlin：\n\n[貼上畫面要求 / mock test 文字]",
  which_file:
    "考試急用。我唔知要改邊個檔案。請直接列檔案名，逐個講要貼咩 code。解釋最多 3 句：\n\n[貼上題目 / code / error]",
  turn_requirement_into_code:
    "考試急用。請將下面題目直接變成可 copy 答案。先列檔案名，再直接輸出最短 code。唔好長篇教學：\n\n[貼上題目全文]",
  variant_answer:
    "考試急用。下面題目可能同 mock test 唔完全一樣。請先判斷 Entity 名同欄位，然後直接改成可 copy 答案。要列清楚每段 code 貼去邊個檔案、貼喺邊個位置：\n\n[貼上今日題目 / 要求]",
  test_file_step_by_step:
    "考試急用。我會上載今日 Test 題目檔案。請先完整讀題，然後 Step-by-Step 俾我答案，包括 Android Studio 要點樣操作、要開邊個檔案、每個檔案貼咩 code、每段 code 貼喺邊個位置。請用呢個格式回答：\n\n1. 先判斷題目要做咩 app、Entity 名、欄位、頁面、功能。\n2. 列出要建立 / 修改嘅檔案清單，逐個講用途。\n3. 由 Android Studio 操作開始教：New Project / Sync Gradle / 建 Kotlin file / 建 XML / 加 Activity / Run app。\n4. 每一步都先講「喺 Android Studio 做咩」，再俾可 copy code。\n5. 每一步最後加一行「下一步：...」，直接話我做完呢步之後要做咩。\n6. 如果題目同 mock test 唔同，請即刻把 Camera / Task 改成題目真正要求嘅名稱同欄位。\n7. 唔好長篇解釋，優先俾可 copy 答案同考試可即做嘅步驟。\n\n[我已上載 Test 題目檔案，請根據附件回答]",
  source_location:
    "考試急用。請話我知呢個要求對應返邊份 Lab / PowerPoint / 官方網站概念，然後直接俾最短可 copy 做法。唔好長篇解釋：\n\n[貼上題目句子 / 唔明嘅位]",
};

const BOT_AVATAR = `
  <svg viewBox="0 0 24 24" class="chat-icon">
    <path d="M12 2 4 6v6c0 5.1 3.4 9.8 8 11 4.6-1.2 8-5.9 8-11V6l-8-4Z" fill="currentColor"/>
  </svg>
`;

const USER_AVATAR = `
  <svg viewBox="0 0 24 24" class="chat-icon">
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" fill="currentColor"/>
  </svg>
`;

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

function getStoredProvider() {
  return normalizeProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE) || DEFAULT_PROVIDER);
}

function normalizeProvider(provider) {
  return String(provider || "").trim().toLowerCase() === "deepseek" ? "deepseek" : "gemini";
}

function getDefaultBaseUrl(provider) {
  return provider === "deepseek" ? DEFAULT_DEEPSEEK_BASE_URL : DEFAULT_GEMINI_BASE_URL;
}

function getDefaultModel(provider) {
  return provider === "deepseek" ? "deepseek-reasoner" : DEFAULT_MODEL;
}

function getStoredBaseUrl(provider = getStoredProvider()) {
  return (window.localStorage.getItem(AI_BASE_URL_STORAGE) || getDefaultBaseUrl(provider)).trim() || getDefaultBaseUrl(provider);
}

function getStoredDeepSeekKey() {
  return (window.localStorage.getItem(AI_DEEPSEEK_KEY_STORAGE) || "").trim();
}

function getStoredModel(provider = getStoredProvider()) {
  return (window.localStorage.getItem(AI_MODEL_STORAGE) || getDefaultModel(provider)).trim() || getDefaultModel(provider);
}

function getActiveKeyIndex(poolLength) {
  const value = Number.parseInt(window.localStorage.getItem(AI_ACTIVE_KEY_INDEX_STORAGE) || "0", 10);
  if (!Number.isFinite(value) || value < 0 || poolLength <= 0) {
    return 0;
  }
  return value % poolLength;
}

function saveConfig() {
  const selectedProvider = normalizeProvider(aiProvider?.value || chatProviderSelect?.value);

  window.localStorage.setItem(AI_PROVIDER_STORAGE, selectedProvider);

  if (aiBaseUrl) {
    const value = aiBaseUrl.value.trim() || getDefaultBaseUrl(selectedProvider);
    window.localStorage.setItem(AI_BASE_URL_STORAGE, value);
  }

  if (aiKeyPool) {
    const value = aiKeyPool.value.trim();
    if (value) {
      window.localStorage.setItem(AI_KEY_POOL_STORAGE, value);
    } else {
      window.localStorage.removeItem(AI_KEY_POOL_STORAGE);
    }
  }

  if (aiDeepSeekKey) {
    const value = aiDeepSeekKey.value.trim();
    if (value) {
      window.localStorage.setItem(AI_DEEPSEEK_KEY_STORAGE, value);
    } else {
      window.localStorage.removeItem(AI_DEEPSEEK_KEY_STORAGE);
    }
  }

  if (aiHiddenModel) {
    const value = aiHiddenModel.value.trim() || getDefaultModel(selectedProvider);
    window.localStorage.setItem(AI_MODEL_STORAGE, value);
  }

  window.localStorage.setItem(AI_ACTIVE_KEY_INDEX_STORAGE, "0");
  syncProviderControls(selectedProvider);
  pingAi();
}

function loadConfig() {
  const provider = getStoredProvider();

  syncProviderControls(provider);

  if (aiBaseUrl) {
    aiBaseUrl.value = getStoredBaseUrl(provider);
  }

  if (aiKeyPool) {
    aiKeyPool.value = window.localStorage.getItem(AI_KEY_POOL_STORAGE) || "";
  }

  if (aiDeepSeekKey) {
    aiDeepSeekKey.value = getStoredDeepSeekKey();
  }

  if (aiHiddenModel) {
    aiHiddenModel.value = getStoredModel(provider);
  }
}

function shouldRotateKey(message) {
  return /429|quota|resource[_ ]?exhausted|rate|exceed|limit|too many|unavailable|high demand|spikes in demand|try again later/i.test(message);
}

function applyProviderDefaults(provider) {
  const selectedProvider = normalizeProvider(provider);

  if (aiBaseUrl) {
    const current = aiBaseUrl.value.trim();
    if (!current || current === DEFAULT_GEMINI_BASE_URL || current === DEFAULT_DEEPSEEK_BASE_URL) {
      aiBaseUrl.value = getDefaultBaseUrl(selectedProvider);
    }
  }

  if (aiHiddenModel) {
    const currentModel = aiHiddenModel.value.trim();
    if (!currentModel || currentModel === "gemini-2.5-flash" || currentModel === "deepseek-reasoner") {
      aiHiddenModel.value = getDefaultModel(selectedProvider);
    }
  }
}

function syncProviderControls(provider) {
  const selectedProvider = normalizeProvider(provider);
  if (aiProvider) {
    aiProvider.value = selectedProvider;
  }
  if (chatProviderSelect) {
    chatProviderSelect.value = selectedProvider;
  }
}

function switchProvider(provider) {
  const selectedProvider = normalizeProvider(provider);
  window.localStorage.setItem(AI_PROVIDER_STORAGE, selectedProvider);

  const currentBase = window.localStorage.getItem(AI_BASE_URL_STORAGE) || "";
  if (!currentBase || currentBase === DEFAULT_GEMINI_BASE_URL || currentBase === DEFAULT_DEEPSEEK_BASE_URL) {
    window.localStorage.setItem(AI_BASE_URL_STORAGE, getDefaultBaseUrl(selectedProvider));
  }

  const currentModel = window.localStorage.getItem(AI_MODEL_STORAGE) || "";
  if (!currentModel || currentModel === "gemini-2.5-flash" || currentModel === "deepseek-reasoner") {
    window.localStorage.setItem(AI_MODEL_STORAGE, getDefaultModel(selectedProvider));
  }

  syncProviderControls(selectedProvider);
  loadConfig();
  pingAi();
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&quot;";
  });
}

function formatText(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function formatTime(isoString) {
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return "";
  }
}

function makeMessageId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getDefaultMessages() {
  return [
    {
      id: makeMessageId(),
      role: "assistant",
      text: "我而家會用對話方式答你。你可以直接問 Room、RecyclerView、Intent、XML、Kotlin，或者上傳 PDF、PPT、code 同圖片。",
      attachments: [],
      pending: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

function normalizeMessages(raw) {
  if (!Array.isArray(raw) || !raw.length) {
    return getDefaultMessages();
  }

  const normalized = raw
    .filter((item) => item && typeof item.text === "string" && typeof item.role === "string")
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : makeMessageId(),
      role: item.role === "user" ? "user" : "assistant",
      text: item.text,
      attachments: Array.isArray(item.attachments) ? item.attachments.filter((entry) => typeof entry === "string") : [],
      pending: Boolean(item.pending),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }));

  return normalized.length ? normalized : getDefaultMessages();
}

function loadChatMessages() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAT_HISTORY_STORAGE) || "[]");
    return normalizeMessages(parsed);
  } catch (error) {
    return getDefaultMessages();
  }
}

let chatMessages = loadChatMessages();

function saveChatMessages() {
  window.localStorage.setItem(
    CHAT_HISTORY_STORAGE,
    JSON.stringify(chatMessages.slice(-MAX_CHAT_MESSAGES))
  );
}

function scrollChatToBottom() {
  if (!chatHistory) return;
  requestAnimationFrame(() => {
    chatHistory.scrollTop = chatHistory.scrollHeight;
  });
}

function renderChatMessages() {
  if (!chatHistory) return;

  chatHistory.innerHTML = chatMessages
    .map((message) => {
      const isUser = message.role === "user";
      const avatar = isUser ? USER_AVATAR : BOT_AVATAR;
      const author = isUser ? "You" : "Helper";
      const attachmentHtml = message.attachments.length
        ? `
          <div class="chat-message-files">
            ${message.attachments
              .map((name) => `<span class="chat-file-pill">${escapeHtml(name)}</span>`)
              .join("")}
          </div>
        `
        : "";

      return `
        <div class="chat-row ${isUser ? "is-user" : "is-assistant"}">
          <div class="chat-avatar ${isUser ? "user-avatar" : "bot-avatar"}">${avatar}</div>
          <div class="chat-message-stack">
            <div class="chat-author">${author}</div>
            ${attachmentHtml}
            <div class="chat-bubble ${isUser ? "user-bubble" : "assistant-bubble"} ${message.pending ? "is-pending" : ""}">
              ${formatText(message.text)}
            </div>
            <div class="chat-time">${formatTime(message.createdAt)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  scrollChatToBottom();
}

function pushMessage(role, text, options = {}) {
  const message = {
    id: makeMessageId(),
    role,
    text,
    attachments: options.attachments || [],
    pending: Boolean(options.pending),
    createdAt: new Date().toISOString(),
  };

  chatMessages = [...chatMessages, message].slice(-MAX_CHAT_MESSAGES);
  saveChatMessages();
  renderChatMessages();
  return message.id;
}

function updateMessage(messageId, updates) {
  chatMessages = chatMessages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    return {
      ...message,
      ...updates,
      pending: false,
    };
  });

  saveChatMessages();
  renderChatMessages();
}

function autoGrowTextarea() {
  if (!aiQuestion) return;
  aiQuestion.style.height = "auto";
  aiQuestion.style.height = `${Math.min(aiQuestion.scrollHeight, 180)}px`;
}

function clearComposer() {
  if (aiQuestion) {
    aiQuestion.value = "";
    autoGrowTextarea();
  }

  if (aiFileInput) {
    aiFileInput.value = "";
  }

  renderSelectedFiles();
}

function insertTemplate(template) {
  if (!aiQuestion) return;

  const current = aiQuestion.value.trim();
  aiQuestion.value = current ? `${current}\n\n${template}` : template;
  autoGrowTextarea();
  aiQuestion.focus();
  aiQuestion.setSelectionRange(aiQuestion.value.length, aiQuestion.value.length);
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

async function buildFileParts(files, provider) {
  const parts = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      parts.push({
        text: `附加檔案 ${file.name} 太大，已跳過。請改用較細文件或先壓縮內容。`,
      });
      continue;
    }

    const ext = normalizeExtension(file.name);

    if (provider === "gemini" && isInlineMedia(file, ext)) {
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

    if (provider === "deepseek" && isInlineMedia(file, ext)) {
      parts.push({
        text: `Attached file ${file.name}: binary attachment detected. In DeepSeek mode, please ask based on filename/description or upload text-based notes instead.`,
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
        `Built-in course context:\n${BUILT_IN_EXAM_CONTEXT}\n\nExtra runtime context:\n${context}`,
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

function buildDeepSeekMessages(question, context, fileParts) {
  const joinedFileText = fileParts
    .map((part) => (part && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n");

  const userContent = [
    joinedFileText,
    `Question:\n${question}`,
  ]
    .filter(Boolean)
    .join("\n\n");

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

async function askDeepSeekDirect(question, context, model, apiKey, baseUrl, fileParts) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "deepseek-reasoner",
      stream: false,
      messages: buildDeepSeekMessages(question, context, fileParts),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error?.message || `DeepSeek request failed (${response.status})`);
  }

  const answer = payload.choices?.[0]?.message?.content?.trim() || "";
  if (!answer) {
    throw new Error("DeepSeek 沒有回覆內容");
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
  const provider = getStoredProvider();
  const response = await fetch(localAskUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider,
      base_url: getStoredBaseUrl(provider),
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

async function askNetlifyFunction(question, context, fileParts) {
  const provider = getStoredProvider();
  const response = await fetch(netlifyAskUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider,
      base_url: getStoredBaseUrl(provider),
      model: getStoredModel(),
      question,
      context,
      parts: fileParts,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Netlify function failed");
  }

  return payload.answer || "AI 沒有回覆內容。";
}

async function pingAi() {
  const provider = getStoredProvider();

  if (provider === "gemini" && getStoredKeyPool().length) {
    setAiStatus("已就緒", "status-ready");
    return;
  }

  if (provider === "deepseek" && getStoredDeepSeekKey()) {
    setAiStatus("已就緒", "status-ready");
    return;
  }

  if (window.location.hostname.endsWith(".netlify.app")) {
    setAiStatus("雲端", "status-ready");
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

async function handleAsk() {
  const provider = getStoredProvider();
  const question = aiQuestion?.value?.trim() || "";
  const files = [...(aiFileInput?.files || [])];
  const attachmentNames = files.map((file) => file.name);
  const context =
    "Current page context: the user is likely inside the public ITP4203 notes website and may paste a new practical-test requirement, an Android Studio error, XML/Kotlin code, or a screenshot/file. Assume they need the fastest safe answer for the current Android Kotlin task.";

  if (!question) {
    pushMessage("assistant", "請先輸入問題。");
    return;
  }

  pushMessage("user", question, { attachments: attachmentNames });
  clearComposer();
  setAiStatus("思考中");
  const pendingId = pushMessage("assistant", "思考中...", { pending: true });

  try {
    const fileParts = await buildFileParts(files, provider);
    let answer = "";

    if (provider === "gemini" && getStoredKeyPool().length) {
      answer = await askWithKeyPool(question, context, fileParts);
    } else if (provider === "deepseek" && getStoredDeepSeekKey()) {
      answer = await askDeepSeekDirect(
        question,
        context,
        getStoredModel(),
        getStoredDeepSeekKey(),
        getStoredBaseUrl(provider),
        fileParts
      );
    } else if (window.location.hostname.endsWith(".netlify.app")) {
      answer = await askNetlifyFunction(question, context, fileParts);
    } else {
      answer = await askLocalProxy(question, context, fileParts);
    }

    updateMessage(pendingId, { text: answer });
    setAiStatus("已完成", "status-ready");
  } catch (error) {
    updateMessage(pendingId, {
      text:
        `AI 未能使用：${error.message}\n\n` +
        "隱藏設定：Mac 用 Command + Option + K；Windows 用 Ctrl + Alt + K；或者右擊右下透明點。",
    });
    setAiStatus("出錯", "status-error");
  }
}

if (hiddenAiTrigger) {
  hiddenAiTrigger.addEventListener("click", () => {
    openModal(aiModal);
    renderChatMessages();
    autoGrowTextarea();
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

if (panicHideStrip) {
  panicHideStrip.addEventListener("click", (event) => {
    if (event.target !== closeAiModal) {
      closeModal(aiModal);
    }
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

  if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openModal(aiConfigModal);
    aiKeyPool?.focus();
  }
});

if (aiQuestion) {
  aiQuestion.addEventListener("input", () => {
    autoGrowTextarea();
  });

  aiQuestion.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAsk();
    }
  });
}

if (aiFileInput) {
  aiFileInput.addEventListener("change", () => {
    renderSelectedFiles();
  });
}

if (aiProvider) {
  aiProvider.addEventListener("change", () => {
    applyProviderDefaults(aiProvider.value);
  });
}

if (chatProviderSelect) {
  chatProviderSelect.addEventListener("change", () => {
    switchProvider(chatProviderSelect.value);
  });
}

promptChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.templateKey || "";
    const template = PROMPT_TEMPLATES[key];
    if (template) {
      insertTemplate(template);
    }
  });
});

if (askAiButton) {
  askAiButton.addEventListener("click", () => {
    handleAsk();
  });
}

loadConfig();
applyProviderDefaults(getStoredProvider());
renderSelectedFiles();
renderChatMessages();
autoGrowTextarea();
pingAi();
