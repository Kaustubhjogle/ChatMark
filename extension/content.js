function normalizeFirstLine(text) {
  const collapsed = (text || "")
    .replace(/\s+/g, " ")
    .replace(/^[`"'“”‘’\s]+/, "")
    .trim();

  if (!collapsed) {
    return "(empty question)";
  }

  const meaningful = /[A-Za-z0-9]/.test(collapsed) ? collapsed : normalizeSnippet(text, 90);
  return meaningful.length > 90 ? `${meaningful.slice(0, 87)}...` : meaningful;
}

function normalizeSnippet(text, limit) {
  const collapsed = (text || "").replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "";
  }

  return collapsed.length > limit ? `${collapsed.slice(0, limit - 3)}...` : collapsed;
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
  const allMessageNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));
  const nodes = getUserMessageNodes();

  return nodes
    .map((node, index) => {
      const text = (node.innerText || node.textContent || "").trim();
      if (!text) {
        return null;
      }

      return {
        index,
        firstLine: normalizeFirstLine(text),
        answerPreview: getAnswerPreviewForNode(node, allMessageNodes)
      };
    })
    .filter(Boolean);
}

function getAnswerPreviewForNode(userNode, allMessageNodes) {
  const startIndex = allMessageNodes.indexOf(userNode);
  if (startIndex === -1) {
    return "(no answer yet)";
  }

  for (let i = startIndex + 1; i < allMessageNodes.length; i += 1) {
    const node = allMessageNodes[i];
    const role = node.getAttribute("data-message-author-role");
    if (role === "assistant") {
      const text = normalizeSnippet(node.innerText || node.textContent || "", 70);
      return text || "(no answer yet)";
    }
    if (role === "user") {
      break;
    }
  }

  return "(no answer yet)";
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
