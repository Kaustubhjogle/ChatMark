# PromptPane - AI Chat Prompt Navigator

> **Instantly navigate every question you've asked in the current chat across ChatGPT, Gemini, and Claude.**

PromptPane is a zero-permission-bloat Chrome extension that reads your active AI chat page, extracts your user prompts, shows a numbered list with a short preview of the AI's reply, and scrolls you directly to any exchange on click. No data ever leaves your browser.

---

## ✦ Why PromptPane?

Long AI conversations become archives. Finding the exact question you asked twenty exchanges ago means endless scrolling, losing context, and losing time. PromptPane adds a clean, one-click index of every prompt you sent — right inside the browser toolbar.

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
| **Manifest V3** | Built on Chrome's current extension platform standard |

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

## ✦ Architecture

```
extension/
├── manifest.json       # MV3 manifest — declares host permissions, content scripts, action
├── content.js          # Injected into supported chat pages
│   ├── getHostProvider()          # Detects ChatGPT / Gemini / Claude
│   ├── getRoleSelectors()         # Returns DOM selectors per provider
│   ├── getTurns()                 # Collects & sorts user+assistant nodes by DOM order
│   ├── getQuestions()             # Extracts firstLine + answerPreview for each user turn
│   └── scrollToQuestion(index)    # Smooth scroll + teal highlight pulse
├── popup.html          # Extension popup shell
├── popup.js            # Popup logic
│   ├── isSupportedChatUrl()       # Guards against non-chat tabs
│   ├── loadQuestions()            # Queries active tab via messaging API
│   └── Event delegation           # Single listener on question list for navigation
├── popup.css           # Glassmorphism UI with full dark mode support
└── icon{16,32,48,128}.png
```

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
   git clone https://github.com/<your-username>/PromptPane.git
   cd PromptPane
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

PromptPane processes chat page content entirely within your browser. It does not transmit any data to external servers, does not use remote code, does not store conversation content, and does not require authentication. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

---

## ✦ Permissions

| Permission | Reason |
|---|---|
| `activeTab` | Required to send messages to the content script in the current tab |
| Host permissions (`chatgpt.com`, `chat.openai.com`, `gemini.google.com`, `claude.ai`) | Required to inject the content script and read DOM content on supported pages only |

No broad `<all_urls>` permission is used.

---

## ✦ Project Status

| Version | Status |
|---|---|
| 1.0.0 | Stable — ChatGPT, Gemini, Claude supported |

Planned improvements:
- Support for additional AI platforms (Copilot, Mistral, Perplexity)
- Keyboard shortcut to open the popup
- Search/filter within the prompt list

---

## ✦ Resume Highlights

This project demonstrates:

- **Chrome Extensions Manifest V3** — content scripts, action popup, host permissions, and cross-script messaging via `chrome.runtime` / `chrome.tabs` API
- **DOM traversal and provider-specific selector strategies** — handling structural differences across three major AI platforms without a shared framework
- **JavaScript module design** — pure functions, no global state leakage, `compareDocumentPosition`-based sort for deterministic turn ordering
- **CSS custom properties + `prefers-color-scheme`** — complete light/dark theming with zero JavaScript
- **Privacy-by-design** — minimal permissions, no external network calls, no data persistence

---

## ✦ License

MIT — see [LICENSE](LICENSE) for details.