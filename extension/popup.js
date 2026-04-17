const subtitleEl = document.getElementById("subtitle");
const questionListEl = document.getElementById("questionList");
const emptyStateEl = document.getElementById("emptyState");
const errorStateEl = document.getElementById("errorState");
const reloadButtonEl = document.getElementById("reloadButton");
let activeTabId = null;

const SUPPORTED_URL_PATTERNS = [
  /^https:\/\/chatgpt\.com\/c\//i,
  /^https:\/\/chat\.openai\.com\/c\//i,
  /^https:\/\/gemini\.google\.com\/app/i,
  /^https:\/\/claude\.ai\/chat\//i
];

function isSupportedChatUrl(url) {
  if (typeof url !== "string") {
    return false;
  }

  return SUPPORTED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function showError(message, showReload = false) {
  subtitleEl.textContent = "Unable to read this page.";
  errorStateEl.textContent = message;
  errorStateEl.classList.remove("hidden");

  if (showReload) {
    reloadButtonEl.classList.remove("hidden");
  } else {
    reloadButtonEl.classList.add("hidden");
  }
}

function createQuestionItem(question, index) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  const questionRow = document.createElement("div");
  const indexEl = document.createElement("span");
  const questionTextEl = document.createElement("span");

  button.className = "question-item";
  button.type = "button";
  button.dataset.index = String(index);
  questionRow.className = "question-row";
  indexEl.className = "index";
  questionTextEl.className = "question-text";

  indexEl.textContent = `${index + 1}.`;
  questionTextEl.textContent = question.firstLine;

  questionRow.appendChild(indexEl);
  questionRow.appendChild(questionTextEl);
  button.appendChild(questionRow);

  li.appendChild(button);
  return li;
}

async function loadQuestions() {
  questionListEl.textContent = "";
  emptyStateEl.classList.add("hidden");
  errorStateEl.classList.add("hidden");
  reloadButtonEl.classList.add("hidden");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    showError("Open a supported chat page, then click the extension again.");
    return;
  }

  activeTabId = tab.id;

  if (!isSupportedChatUrl(tab.url || "")) {
    showError("Open a ChatGPT, Gemini, or Claude conversation page.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "getQuestions" }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Could not connect to this chat. Reload the tab and try again.", true);
      return;
    }

    if (!response?.ok) {
      showError(response?.error || "No response from page.");
      return;
    }

    const { questions } = response;
    subtitleEl.textContent = `${questions.length} question${questions.length === 1 ? "" : "s"} found in this chat.`;

    if (!questions.length) {
      emptyStateEl.classList.remove("hidden");
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const [index, question] of questions.entries()) {
      fragment.appendChild(createQuestionItem(question, index));
    }
    questionListEl.appendChild(fragment);
  });
}

loadQuestions().catch((error) => {
  showError(error?.message || "Unexpected error.");
});

reloadButtonEl.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return;
  }

  await chrome.tabs.reload(tab.id);
  window.close();
});

questionListEl.addEventListener("click", (event) => {
  const button = event.target?.closest?.("button.question-item");
  if (!button || !Number.isInteger(activeTabId)) {
    return;
  }

  const index = Number.parseInt(button.dataset.index || "", 10);
  if (!Number.isInteger(index)) {
    return;
  }

  chrome.tabs.sendMessage(activeTabId, {
    action: "scrollToQuestion",
    index
  });
});
