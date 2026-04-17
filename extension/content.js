function normalizeFirstLine(text) {
  const cleaned = (text || "").replace(/^\s*(you|gemini|claude)\s+said\s*:?\s*/i, "");
  const collapsed = cleaned
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

function getTextFromNode(node) {
  return (node.innerText || node.textContent || "").trim();
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

function getNodesFromSelectors(selectors) {
  const all = [];
  for (const selector of selectors) {
    all.push(...document.querySelectorAll(selector));
  }
  return uniqueOrdered(all);
}

function inferRoleFromNode(node) {
  const roleAttr = (
    node.getAttribute("data-message-author-role") ||
    node.getAttribute("data-testid") ||
    node.getAttribute("data-test-id") ||
    node.getAttribute("aria-label") ||
    ""
  ).toLowerCase();

  if (roleAttr.includes("assistant") || roleAttr.includes("claude")) {
    return "assistant";
  }
  if (roleAttr.includes("user") || roleAttr.includes("human") || roleAttr.includes("you")) {
    return "user";
  }

  const text = getTextFromNode(node).toLowerCase();
  const className = (typeof node.className === "string" ? node.className : "").toLowerCase();
  if (className.includes("claude-response") || className.includes("claude-message")) {
    return "assistant";
  }
  if (/^\s*claude\s+said\b/.test(text)) {
    return "assistant";
  }
  if (/^\s*(you|human)\s+said\b/.test(text)) {
    return "user";
  }

  return null;
}

function turnsFromNodesWithInferredRoles(nodes) {
  return nodes
    .map((node) => ({
      role: inferRoleFromNode(node),
      node,
      text: getTextFromNode(node)
    }))
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.text);
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

function getClaudeAssistantCandidateNodes() {
  return getNodesFromSelectors([
    ".font-claude-response",
    ".font-claude-response-body",
    '[data-is-streaming] .font-claude-response',
    '[data-testid="message-content"]',
    '[data-test-id="message-content"]',
    '[data-testid="assistant-message"]',
    '[data-test-id="assistant-message"]',
    '[aria-label^="Claude said"]',
    '[aria-label*="Claude said"]',
    ".font-claude-message",
    '[class*="claude-message"]'
  ]);
}

function getFirstFollowingClaudeAssistantText(userNode) {
  const candidates = getClaudeAssistantCandidateNodes()
    .map((node) => ({
      node,
      role: inferRoleFromNode(node),
      text: getTextFromNode(node)
    }))
    .filter((item) => item.text);

  const sortedCandidates = sortTurnsByDom(candidates);

  for (const item of sortedCandidates) {
    const position = userNode.compareDocumentPosition(item.node);
    const followsUser = Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING);
    if (!followsUser) {
      continue;
    }

    if (item.role === "user") {
      continue;
    }

    return item.text;
  }

  return "";
}

function getTurnsForChatGPT() {
  const nodes = getNodesFromSelectors([
    '[data-message-author-role]'
  ]);

  return nodes
    .map((node) => ({
      role: node.getAttribute("data-message-author-role"),
      node,
      text: getTextFromNode(node)
    }))
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.text);
}

function getTurnsForGemini() {
  const userNodes = getNodesFromSelectors([
    "user-query",
    '[data-test-id="user-message"]',
    '[aria-label*="You said"]',
    '[aria-label="You"]'
  ]);
  const assistantNodes = getNodesFromSelectors([
    "model-response",
    '[data-test-id="model-response"]',
    '[aria-label*="Gemini"]'
  ]);

  const turns = [
    ...userNodes.map((node) => ({ role: "user", node, text: getTextFromNode(node) })),
    ...assistantNodes.map((node) => ({ role: "assistant", node, text: getTextFromNode(node) }))
  ]
    .filter((turn) => turn.text);

  return sortTurnsByDom(turns);
}

function getTurnsForClaude() {
  const canonicalNodes = getNodesFromSelectors([
    '[data-testid="user-message"]',
    '[data-test-id="user-message"]',
    ".font-claude-response",
    ".font-claude-response-body",
    '[data-is-streaming] .font-claude-response',
    '[data-testid="message-content"]',
    '[data-test-id="message-content"]'
  ]);

  const canonicalTurns = canonicalNodes
    .map((node) => {
      const testid = (node.getAttribute("data-testid") || node.getAttribute("data-test-id") || "").toLowerCase();
      const className = (typeof node.className === "string" ? node.className : "").toLowerCase();
      const role = testid === "user-message"
        ? "user"
        : testid === "message-content" || className.includes("claude-response") || className.includes("claude-message")
          ? "assistant"
          : null;
      return {
        role,
        node,
        text: getTextFromNode(node)
      };
    })
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.text);

  const canonicalHasUser = canonicalTurns.some((turn) => turn.role === "user");
  const canonicalHasAssistant = canonicalTurns.some((turn) => turn.role === "assistant");
  if (canonicalHasUser && canonicalHasAssistant) {
    return sortTurnsByDom(canonicalTurns);
  }

  const userNodes = getNodesFromSelectors([
    '[data-testid="user-message"]',
    '[data-test-id="user-message"]',
    '[data-testid*="user-message"]',
    '[data-test-id*="user-message"]',
    '[aria-label*="Human"]',
    '[aria-label*="You said"]',
    '[aria-label*="You"]'
  ]);
  const assistantNodes = getNodesFromSelectors([
    ".font-claude-response",
    ".font-claude-response-body",
    '[data-is-streaming] .font-claude-response',
    '[data-testid="assistant-message"]',
    '[data-test-id="assistant-message"]',
    '[data-testid="message-content"]',
    '[data-test-id="message-content"]',
    '[data-testid*="assistant-message"]',
    '[data-test-id*="assistant-message"]',
    '[data-testid*="claude"]',
    '[data-test-id*="claude"]',
    '[aria-label*="Claude said"]',
    '[aria-label*="Claude"]'
  ]);

  const directTurns = [
    ...userNodes.map((node) => ({ role: "user", node, text: getTextFromNode(node) })),
    ...assistantNodes.map((node) => ({ role: "assistant", node, text: getTextFromNode(node) }))
  ]
    .filter((turn) => turn.text);

  const hasUser = directTurns.some((turn) => turn.role === "user");
  const hasAssistant = directTurns.some((turn) => turn.role === "assistant");
  if (hasUser && hasAssistant) {
    return sortTurnsByDom(directTurns);
  }

  const fallbackNodes = getNodesFromSelectors([
    '[aria-label*="said"]',
    '[data-testid*="message"]',
    '[data-test-id*="message"]',
    '[data-testid*="turn"]',
    '[data-test-id*="turn"]'
  ]);

  const fallbackTurns = sortTurnsByDom(turnsFromNodesWithInferredRoles(fallbackNodes));

  return fallbackTurns.length ? fallbackTurns : directTurns;
}

function getGenericTurns() {
  const nodes = getNodesFromSelectors([
    '[data-message-author-role]',
    '[data-testid*="user-message"]',
    '[data-testid*="assistant-message"]',
    '[data-test-id*="user-message"]',
    '[data-test-id*="assistant-message"]'
  ]);

  return nodes
    .map((node) => {
      const roleAttr = (
        node.getAttribute("data-message-author-role") ||
        node.getAttribute("data-testid") ||
        node.getAttribute("data-test-id") ||
        ""
      ).toLowerCase();
      const role = roleAttr.includes("assistant") ? "assistant" : roleAttr.includes("user") ? "user" : null;
      return {
        role,
        node,
        text: getTextFromNode(node)
      };
    })
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && turn.text);
}

function getTurns() {
  const provider = getHostProvider();
  if (provider === "chatgpt") {
    return getTurnsForChatGPT();
  }
  if (provider === "gemini") {
    return getTurnsForGemini();
  }
  if (provider === "claude") {
    return getTurnsForClaude();
  }
  return getGenericTurns();
}

function getQuestions() {
  const provider = getHostProvider();
  const turns = getTurns();
  const userTurns = turns.filter((turn) => turn.role === "user");

  return userTurns
    .map((turn, index) => {
      let answerPreview = getAnswerPreviewForTurn(turn, turns);

      if (provider === "claude" && answerPreview === "(no answer yet)") {
        const fallbackText = getFirstFollowingClaudeAssistantText(turn.node);
        if (fallbackText) {
          answerPreview = normalizeSnippet(fallbackText, 70) || "(no answer yet)";
        }
      }

      return {
        index,
        firstLine: normalizeFirstLine(turn.text),
        answerPreview
      };
    })
    .filter((question) => question.firstLine);
}

function getAnswerPreviewForTurn(userTurn, turns) {
  const startIndex = turns.indexOf(userTurn);
  if (startIndex === -1) {
    return "(no answer yet)";
  }

  for (let i = startIndex + 1; i < turns.length; i += 1) {
    const turn = turns[i];
    if (turn.role === "assistant") {
      const text = normalizeSnippet(turn.text, 70);
      return text || "(no answer yet)";
    }
    if (turn.role === "user") {
      break;
    }
  }

  return "(no answer yet)";
}

function scrollToQuestion(index) {
  const userTurns = getTurns().filter((turn) => turn.role === "user");
  const target = userTurns[index]?.node;

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
