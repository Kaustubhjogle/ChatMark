function normalizeFirstLine(text) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "(empty question)";

  return firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine;
}

function getUserMessageNodes() {
  const selectors = [
    '[data-message-author-role="user"]',
    'article[data-testid^="conversation-turn-"] [data-message-author-role="user"]'
  ];

  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    if (nodes.length > 0) {
      return nodes;
    }
  }

  return [];
}

function getQuestions() {
  const nodes = getUserMessageNodes();

  return nodes
    .map((node, index) => {
      const text = (node.innerText || node.textContent || "").trim();
      if (!text) {
        return null;
      }

      return {
        index,
        firstLine: normalizeFirstLine(text)
      };
    })
    .filter(Boolean);
}

function scrollToQuestion(index) {
  const nodes = getUserMessageNodes();
  const target = nodes[index];

  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });

  // Temporary highlight to make the target message easy to spot.
  target.style.transition = "box-shadow 0.2s ease";
  target.style.boxShadow = "0 0 0 3px rgba(13, 148, 136, 0.6)";

  setTimeout(() => {
    target.style.boxShadow = "";
  }, 1200);

  return true;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === "getQuestions") {
    sendResponse({ ok: true, questions: getQuestions() });
    return;
  }

  if (message?.action === "scrollToQuestion") {
    const success = scrollToQuestion(message.index);
    sendResponse({ ok: success, error: success ? undefined : "Question not found." });
  }
});
