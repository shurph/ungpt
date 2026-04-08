/**
 * Strips common chat/markdown markup from text.
 * Order matters: ** / __ bold first, then * list lines, then *…* and _…_ emphasis.
 */
function removeMarkdown(text) {
  let s = text;
  s = s.replace(/\*{3}([^*]+?)\*{3}/g, "$1");
  s = s.replace(/\*{2}([^*]+?)\*{2}/g, "$1");
  s = s.replace(/_{2}([^_]+?)_{2}/g, "$1");
  // Whole-line list marker: leading * and no other * in the line (skip *italic* lines).
  s = s.replace(/^(\s*)\*\s*([^*\n]+)$/gm, (_, ind, rest) => `${ind}- ${rest.replace(/^\s+/, "")}`);
  s = s.replace(/\*([^*\n]+?)\*/g, "$1");
  s = s.replace(/_([^_\n]+?)_/g, "$1");
  return s;
}

/** Removes emoji and related pictographs (Unicode), including two-letter flag sequences. */
function removeEmojis(text) {
  let s = text;
  s = s.replace(/[\u{1F1E6}-\u{1F1FF}]{2}/gu, "");
  s = s.replace(/\p{Extended_Pictographic}/gu, "");
  s = s.replace(/[\u200D\uFE0F\u{1F3FB}-\u{1F3FF}]/gu, "");
  return s;
}

function simplify(text) {
    const RANGE = "__RANGE_DASH__";
    const ELLIPSIS = "__ELLIPSIS__";

    return text
      .replace(/\u00A0/g, " ")
      .replace(/(?<=\d)[—–](?=\d)/g, RANGE)
      .replace(/\s*[—–]\s*/g, " - ")
      .replace(/[“”„«»]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/→/g, "->")
      .replace(/…/g, "...")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.!?;:])/g, "$1")
      // Hide "..." so the next rule does not insert spaces between the dots.
      .replace(/\.\.\./g, ELLIPSIS)
      // Space after punctuation if the next char isn’t whitespace (e.g. "word,word" → "word, word").
      .replace(/([,.!?;:])([^\s])/g, "$1 $2")
      .replace(new RegExp(ELLIPSIS, "g"), "...")
      // Undo false positives for times/numbers: first pass turns "12:30" into "12: 30" — strip that space.
      .replace(/(\d)([:.,]) (\d)/g, "$1$2$3")
      .replace(new RegExp(RANGE, "g"), "-")
      .trim();
  }

  /** Trims leading/trailing whitespace on each line (Unicode, same rules as String trim). */
  function trimLineWhitespace(text) {
    return text.split(/\r?\n/).map((line) => line.trimStart().trimEnd()).join("\n");
  }
  
  const inputText = document.getElementById("inputText");
  const outputText = document.getElementById("outputText");
  const pasteBtn = document.getElementById("pasteBtn");
  const simplifyBtn = document.getElementById("simplifyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const copyBtn = document.getElementById("copyBtn");
  const rmMarkdownEl = document.getElementById("rmMarkdown");
  const rmEmojiEl = document.getElementById("rmEmoji");
  const trimLineWhitespaceEl = document.getElementById("trimLineWhitespace");
  const headerQuickRunBtn = document.getElementById("headerQuickRunBtn");
  const statusEl = document.getElementById("status");
  
  function setStatus(message) {
    statusEl.textContent = message;
  }
  
  async function pasteFromClipboard() {
    try {
      if (!navigator.clipboard?.readText) {
        setStatus("Clipboard API unavailable. Paste the text manually.");
        return;
      }
  
      const text = await navigator.clipboard.readText();
      inputText.value = text;
      setStatus("Pasted from clipboard.");
    } catch (err) {
      setStatus("Could not read clipboard. Paste the text manually.");
    }
  }
  
  function runSimplify() {
    let t = inputText.value;
    // Emoji first; simplify() then fixes spaces and punctuation.
    if (rmEmojiEl.checked) {
      t = removeEmojis(t);
    }
    if (rmMarkdownEl.checked) {
      t = removeMarkdown(t);
    }
    t = simplify(t);
    if (trimLineWhitespaceEl.checked) {
      t = trimLineWhitespace(t);
    }
    outputText.value = t;
    setStatus("Done.");
  }
  
  async function copyResult() {
    try {
      if (!navigator.clipboard?.writeText) {
        outputText.select();
        document.execCommand("copy");
        setStatus("Copied to clipboard.");
        return;
      }
  
      await navigator.clipboard.writeText(outputText.value);
      setStatus("Copied to clipboard.");
    } catch (err) {
      try {
        outputText.select();
        document.execCommand("copy");
        setStatus("Copied to clipboard.");
      } catch {
        setStatus("Could not copy automatically.");
      }
    }
  }
  
  function clearAll() {
    inputText.value = "";
    outputText.value = "";
    setStatus("Cleared.");
  }

  async function pasteSimplifyCopy() {
    await pasteFromClipboard();
    runSimplify();
    await copyResult();
  }
  
  pasteBtn.addEventListener("click", pasteFromClipboard);
  simplifyBtn.addEventListener("click", runSimplify);
  copyBtn.addEventListener("click", copyResult);
  clearBtn.addEventListener("click", clearAll);
  headerQuickRunBtn.addEventListener("click", () => {
    void pasteSimplifyCopy();
  });

  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const settingsWrap = settingsBtn.closest(".settings-wrap");

  function setSettingsOpen(open) {
    settingsPanel.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  settingsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    setSettingsOpen(settingsPanel.hidden);
  });

  document.addEventListener("click", () => {
    if (!settingsPanel.hidden) {
      setSettingsOpen(false);
    }
  });

  settingsWrap.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsPanel.hidden) {
      setSettingsOpen(false);
    }
  });
  
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("./sw.js");
      } catch (err) {
        console.error("SW registration failed", err);
      }
    });
  }