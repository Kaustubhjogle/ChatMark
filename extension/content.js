function stripLeadingUiLabels(text) {
  let cleaned = text || "";

  for (let i = 0; i < 3; i += 1) {
    const next = cleaned
      .replace(/^\s*show\s+thinking\s*:?\s*/i, "")
      .replace(/^\s*(you|human|gemini|claude)\s+said\s*:?\s*/i, "")
      .trimStart();

    if (next === cleaned) {
      break;
    }

    cleaned = next;
  }

  return cleaned;
}

function normalizeFirstLine(text) {
  const collapsed = stripLeadingUiLabels(text)
    .replace(/\s+/g, " ")
    .replace(/^[`\"'“”‘’\s]+/, "")
    .trim();

  if (!collapsed) {
    return "(empty question)";
  }

  return collapsed.length > 90 ? `${collapsed.slice(0, 87)}...` : collapsed;
}

function normalizeSnippet(text, limit = 70) {
  const collapsed = stripLeadingUiLabels(text).replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return "";
  }

  return collapsed.length > limit ? `${collapsed.slice(0, limit - 3)}...` : collapsed;
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

function getRoleSelectors(provider) {
  if (provider === "chatgpt") {
    return {
      user: ['[data-message-author-role="user"]'],
      assistant: ['[data-message-author-role="assistant"]']
    };
  }

  if (provider === "gemini") {
    return {
      user: [
        "user-query",
        '[data-test-id="user-message"]',
        '[aria-label*="You said"]',
        '[aria-label="You"]'
      ],
      assistant: [
        "model-response",
        '[data-test-id="model-response"]',
        '[aria-label*="Gemini"]'
      ]
    };
  }

  if (provider === "claude") {
    return {
      user: [
        '[data-testid="user-message"]',
        '[data-test-id="user-message"]',
        '[data-testid*="user-message"]',
        '[data-test-id*="user-message"]',
        '[aria-label*="Human"]',
        '[aria-label*="You said"]',
        '[aria-label*="You"]'
      ],
      assistant: [
        '.font-claude-response',
        '.font-claude-response-body',
        '[data-testid="assistant-message"]',
        '[data-test-id="assistant-message"]',
        '[data-testid="message-content"]',
        '[data-test-id="message-content"]',
        '[aria-label*="Claude said"]',
        '[aria-label*="Claude"]'
      ]
    };
  }

  return {
    user: [
      '[data-message-author-role="user"]',
      '[data-testid*="user-message"]',
      '[data-test-id*="user-message"]',
      '[aria-label*="You said"]'
    ],
    assistant: [
      '[data-message-author-role="assistant"]',
      '[data-testid*="assistant-message"]',
      '[data-test-id*="assistant-message"]',
      '[aria-label*="said"]'
    ]
  };
}

function sortTurnsByDom(turns) {
  return turns.sort((a, b) => {
    if (a.node === b.node) {
      return 0;
    }

    const position = a.node.compareDocumentPosition(b.node);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }

    return 0;
  });
}

function getTurns() {
  const provider = getHostProvider();
  const selectors = getRoleSelectors(provider);

  const userTurns = getNodesFromSelectors(selectors.user)
    .map((node) => ({ role: "user", node, text: getTextFromNode(node) }))
    .filter((turn) => turn.text);

  const assistantTurns = getNodesFromSelectors(selectors.assistant)
    .map((node) => ({ role: "assistant", node, text: getTextFromNode(node) }))
    .filter((turn) => turn.text);

  const seenNodes = new Set();
  const turns = [];

  for (const turn of [...userTurns, ...assistantTurns]) {
    if (seenNodes.has(turn.node)) {
      continue;
    }

    seenNodes.add(turn.node);
    turns.push(turn);
  }

  return sortTurnsByDom(turns);
}

function getAnswerPreviewForTurn(turns, userIndex) {
  for (let i = userIndex + 1; i < turns.length; i += 1) {
    const nextTurn = turns[i];

    if (nextTurn.role === "assistant") {
      const preview = normalizeSnippet(nextTurn.text, 70);
      return preview || "(no answer yet)";
    }

    if (nextTurn.role === "user") {
      break;
    }
  }

  return "(no answer yet)";
}

function getQuestions() {
  const turns = getTurns();

  return turns
    .map((turn, index) => {
      if (turn.role !== "user") {
        return null;
      }

      return {
        index,
        firstLine: normalizeFirstLine(turn.text),
        answerPreview: getAnswerPreviewForTurn(turns, index)
      };
    })
    .filter(Boolean)
    .map((question, uiIndex) => ({
      index: uiIndex,
      firstLine: question.firstLine,
      answerPreview: question.answerPreview
    }));
}

function scrollToQuestion(index) {
  const userTurns = getTurns().filter((turn) => turn.role === "user");
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
