function stripLeadingUiLabels(text) {
  let cleaned = text || "";

  for (let i = 0; i < 3; i += 1) {
    const next = cleaned
      .replace(/^\s*show\s+thinking\s*:?\s*/i, "")
      .replace(/^\s*(you|human)\s+said\s*:?\s*/i, "")
      .trimStart();

    if (next === cleaned) {
      break;
    }

    cleaned = next;
  }

  return cleaned;
}

function normalizeFirstLine(text) {
  const cleaned = stripLeadingUiLabels(text);
  const collapsed = cleaned
    .replace(/\s+/g, " ")
    .replace(/^[`\"'“”‘’\s]+/, "")
    .trim();

  if (!collapsed) {
    return "(empty question)";
  }

  return collapsed.length > 90 ? `${collapsed.slice(0, 87)}...` : collapsed;
}

function getHostProvider() {
  const host = window.location.hostname;

  if (host === "chatgpt.com" || host === "chat.openai.com") {
    return "chatgpt";
  }

  if (host === "gemini.google.com") {
    return "gemini";
  }

  if (host === "claude.ai") {
    return "claude";
  }

  return "unknown";
}

function uniqueOrdered(nodes) {
  const seen = new Set();
  const uniqueNodes = [];

  for (const node of nodes) {
    if (!seen.has(node)) {
      seen.add(node);
      uniqueNodes.push(node);
    }
  }

  return uniqueNodes;
}

function getTextFromNode(node) {
  return (node?.textContent || node?.innerText || "").trim();
}

function getNodesFromSelectors(selectors) {
  const all = [];

  for (const selector of selectors) {
    all.push(...Array.from(document.querySelectorAll(selector)));
  }

  return uniqueOrdered(all);
}

function getUserSelectors(provider) {
  if (provider === "chatgpt") {
    return [
      '[data-message-author-role="user"]'
    ];
  }

  if (provider === "gemini") {
    return [
      "user-query",
      '[data-test-id="user-message"]',
      '[aria-label*="You said"]',
      '[aria-label="You"]'
    ];
  }

  if (provider === "claude") {
    return [
      '[data-testid="user-message"]',
      '[data-test-id="user-message"]',
      '[data-testid*="user-message"]',
      '[data-test-id*="user-message"]',
      '[aria-label*="Human"]',
      '[aria-label*="You said"]',
      '[aria-label*="You"]'
    ];
  }

  return [
    '[data-message-author-role="user"]',
    '[data-testid*="user-message"]',
    '[data-test-id*="user-message"]',
    '[aria-label*="You said"]'
  ];
}

function getUserTurns() {
  const provider = getHostProvider();
  const selectors = getUserSelectors(provider);
  const nodes = getNodesFromSelectors(selectors);

  return nodes
    .map((node) => ({ node, text: getTextFromNode(node) }))
    .filter((turn) => turn.text);
}

function getQuestions() {
  const userTurns = getUserTurns();

  return userTurns
    .map((turn, index) => ({
      index,
      firstLine: normalizeFirstLine(turn.text)
    }))
    .filter((question) => question.firstLine);
}

function scrollToQuestion(index) {
  const userTurns = getUserTurns();
  const target = userTurns[index]?.node;

  if (!target) {
    return false;
  }

  target.scrollIntoView({ behavior: "smooth", block: "center" });

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
