const subtitleEl = document.getElementById("subtitle");
const questionListEl = document.getElementById("questionList");
const emptyStateEl = document.getElementById("emptyState");
const errorStateEl = document.getElementById("errorState");

function showError(message) {
  subtitleEl.textContent = "Unable to read this page.";
  errorStateEl.textContent = message;
  errorStateEl.classList.remove("hidden");
}

function createQuestionItem(question, index) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  const questionRow = document.createElement("div");
  const indexEl = document.createElement("span");
  const questionTextEl = document.createElement("span");
  const answerPreviewEl = document.createElement("div");

  button.className = "question-item";
  button.type = "button";
  questionRow.className = "question-row";
  indexEl.className = "index";
  questionTextEl.className = "question-text";
  answerPreviewEl.className = "answer-preview";

  indexEl.textContent = `${index + 1}.`;
  questionTextEl.textContent = question.firstLine;
  answerPreviewEl.textContent = question.answerPreview || "(no answer yet)";

  questionRow.appendChild(indexEl);
  questionRow.appendChild(questionTextEl);
  button.appendChild(questionRow);
  button.appendChild(answerPreviewEl);

  button.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: "scrollToQuestion",
      index
    });
  });

  li.appendChild(button);
  return li;
}

async function loadQuestions() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url) {
    showError("Open a ChatGPT chat, then click the extension again.");
    return;
  }

  if (!tab.url.includes("chatgpt.com") && !tab.url.includes("chat.openai.com")) {
    showError("This extension works only on ChatGPT pages.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "getQuestions" }, (response) => {
    if (chrome.runtime.lastError) {
      showError("Could not connect to the ChatGPT page. Reload the tab and try again.");
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

    for (const [index, question] of questions.entries()) {
      questionListEl.appendChild(createQuestionItem(question, index));
    }
  });
}

loadQuestions().catch((error) => {
  showError(error?.message || "Unexpected error.");
});
