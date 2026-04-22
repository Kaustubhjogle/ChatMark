# PromptPane — AI Chat Prompt Navigator

> **Instantly navigate every question you've asked in the current chat across ChatGPT, Gemini, and Claude.**

PromptPane is a zero-permission-bloat Chrome extension that reads your active AI chat page, extracts your user prompts, shows a numbered list with a short preview of the AI's reply, and scrolls you directly to any exchange on click. No data ever leaves your browser.

---

## ✦ Why PromptPane?

Long AI conversations become archives. Finding the exact question you asked twenty exchanges ago means endless scrolling, losing context, and losing time. PromptPane adds a clean, one-click index of every prompt you sent right inside the browser toolbar.

---

## ✦ Features

| Feature | Details |
|---|---|
| **Prompt index** | Lists the first line of every user message in the currently open chat |
| **Reply preview** | Shows a 70-character snippet of the immediately following AI response |
| **Scroll-to-prompt** | Clicking any item smoothly scrolls the page to that exchange and briefly highlights the message |
| **Multi-platform** | Works on ChatGPT (`chatgpt.com`), legacy OpenAI Chat (`chat.openai.com`), Google Gemini (`gemini.google.com`), and Claude (`claude.ai`) |
| **Light & dark mode** | Automatically adapts to the user's system color-scheme preference |
| **Privacy-first** | All processing happens locally in the browser tab; no network requests, no external servers, no data storage |

---

## ✦ Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Extensions — Manifest V3 |
| Content script | Vanilla JavaScript (ES2021) |
| Popup UI | HTML5 + CSS3 (CSS custom properties, `prefers-color-scheme`) |
| Inter-script communication | Chrome Extensions `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` |
| DOM navigation | `Node.compareDocumentPosition` for turn ordering |
| Scroll UX | `Element.scrollIntoView` with smooth behavior + CSS box-shadow pulse |
| Build tooling | None — plain files, zero dependencies |

---

### How it works

1. When the popup opens, `popup.js` queries the active tab URL.
2. If the URL matches a supported chat pattern, it sends a `getQuestions` message to the content script running in that tab.
3. `content.js` detects the AI platform, queries the DOM using provider-specific selectors, sorts all turn nodes by DOM position, pairs each user message with the following assistant reply, normalizes whitespace and UI labels (e.g. strips "You said:", "Gemini said:"), and returns a structured array.
4. The popup renders a numbered list. Clicking a list item sends a `scrollToQuestion` message with the item's index.
5. The content script resolves the target node and smoothly scrolls it into view with a brief teal highlight.

---

## ✦ Supported Platforms

| Platform | URL Pattern |
|---|---|
| ChatGPT | `https://chatgpt.com/c/*` |
| ChatGPT (legacy) | `https://chat.openai.com/c/*` |
| Google Gemini | `https://gemini.google.com/app*` |
| Claude | `https://claude.ai/chat/*` |

---

## ✦ Installation (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/Kaustubhjogle/PromptPane.git
   cd extension
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle, top-right).
4. Click **Load unpacked** and select the `extension/` folder.
5. Pin the PromptPane icon to the toolbar.
6. Open any supported chat page, send a few messages, then click the extension icon.

---

## ✦ Usage

1. Open a conversation on ChatGPT, Gemini, or Claude.
2. Click the **PromptPane** icon in the Chrome toolbar.
3. The popup lists every prompt you sent, each with a short preview of the AI's reply.
4. Click any item to jump directly to that point in the conversation.

If the page content script has not loaded yet (e.g. immediately after a fresh tab), a **Reload Page** button appears to recover.

---

## ✦ Privacy

PromptPane processes chat page content entirely within your browser. It does not transmit any data to external servers, does not use remote code, does not store conversation content, and does not require authentication. See [PRIVACY.md](https://kaustubhjogle.github.io/PromptPane/PRIVACY.md) for the full privacy policy.
