(() => {
  "use strict";

  if (window.__KRASKUS_CHTA_HOTFIX_V3__) return;
  window.__KRASKUS_CHTA_HOTFIX_V3__ = true;

  const STYLE_ID = "krMinimumDifficultyStyles";
  const CARD_MARKER = "krMindiffV3";
  const INPUT_ID = "krMinimumShareDifficulty";
  const APPLY_ID = "krApplyMinimumShareDifficulty";
  const MESSAGE_ID = "krMinimumDifficultyMessage";

  let settingsData = null;
  let settingsLoad = null;
  let applying = false;
  let applyQueued = false;
  let lastMessage = "";
  let lastMessageGood = true;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function finitePositive(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function currentMinimum(data = settingsData) {
    return finitePositive(
      data?.minimum_share_difficulty ??
      data?.mindiff ??
      data?.settings?.minimum_share_difficulty
    ) ?? 1024;
  }

  function formatDifficulty(value) {
    const n = finitePositive(value);
    if (n === null) return "—";
    if (n >= 1000) return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(n);
    return String(n);
  }

  function directText(el) {
    return Array.from(el?.childNodes || [])
      .filter(node => node.nodeType === Node.TEXT_NODE)
      .map(node => node.textContent || "")
      .join("")
      .trim();
  }

  function findExactText(root, label) {
    if (!root) return null;
    for (const node of root.querySelectorAll("*")) {
      if (node.textContent.trim() === label || directText(node) === label) return node;
    }
    return null;
  }

  function difficultyCard() {
    const heading = findExactText(document, "Difficulty Policy");
    return heading?.closest?.(".kr-settings-card") || null;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .kr-mindiff-editor{margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.018)}
      .kr-mindiff-editor label{display:block;color:#dfe6e9;font-size:12px;font-weight:700;margin-bottom:8px}
      .kr-mindiff-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
      .kr-mindiff-row input{flex:1 1 210px;min-width:160px;background:#11161a;border:1px solid rgba(255,255,255,.12);border-radius:9px;color:#f4f7f8;padding:11px 12px;font:inherit}
      .kr-mindiff-row button,.kr-mindiff-presets button{border:1px solid rgba(255,255,255,.12);border-radius:8px;background:rgba(255,255,255,.035);color:#dce4e8;padding:9px 12px;cursor:pointer}
      .kr-mindiff-row button{background:rgba(200,168,67,.12);border-color:rgba(200,168,67,.34);color:#e2c566;font-weight:800}
      .kr-mindiff-row button:disabled{opacity:.5;cursor:not-allowed}
      .kr-mindiff-presets{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
      .kr-mindiff-presets button[data-mindiff="0.0007"]{border-color:rgba(27,220,139,.28);color:#6fe3ae}
      .kr-mindiff-help{margin-top:11px;color:#8f9ba2;font-size:12px;line-height:1.55}
      .kr-mindiff-help strong{color:#d8e0e4}
      .kr-mindiff-message{min-height:18px;margin-top:10px;font-size:12px;color:#91a0a8}
      .kr-mindiff-message.good{color:#6fe3ae}.kr-mindiff-message.bad{color:#ff9a88}
    `;
    document.head.appendChild(style);
  }

  async function readJson(url, options) {
    const response = await window.fetch(url, options);
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }
    return data;
  }

  function setMessage(text, good = true) {
    lastMessage = String(text || "");
    lastMessageGood = good;
    const el = document.getElementById(MESSAGE_ID);
    if (el) {
      el.textContent = lastMessage;
      el.classList.toggle("good", good && Boolean(lastMessage));
      el.classList.toggle("bad", !good && Boolean(lastMessage));
    }
  }

  function renderDifficultyCard() {
    const card = difficultyCard();
    if (!card || !settingsData) return false;
    if (card.dataset[CARD_MARKER] === "1") return true;

    installStyles();
    const minimum = currentMinimum();

    card.dataset[CARD_MARKER] = "1";
    card.innerHTML = `
      <div class="kr-settings-card-head">
        <div>
          <span class="kr-panel-eyebrow">MINING</span>
          <h2>Difficulty Policy</h2>
          <p>Set the lowest accepted share difficulty. Lower values support very low-hashrate SHA256 miners such as NMMiner.</p>
        </div>
        <strong class="kr-setting-state good">CONFIGURABLE</strong>
      </div>

      <div class="kr-settings-info-grid">
        <div class="kr-setting-info"><small>Mode</small><strong>VarDiff Floor</strong></div>
        <div class="kr-setting-info"><small>Minimum Difficulty</small><strong>${esc(formatDifficulty(minimum))}</strong></div>
        <div class="kr-setting-info"><small>Starting Difficulty</small><strong>${esc(formatDifficulty(minimum))}</strong></div>
        <div class="kr-setting-info"><small>Maximum Difficulty</small><strong>Automatic</strong></div>
        <div class="kr-setting-info"><small>Update Interval</small><strong>15 seconds</strong></div>
        <div class="kr-setting-info"><small>Stratum Port</small><strong>3336</strong></div>
      </div>

      <div class="kr-mindiff-editor">
        <label for="${INPUT_ID}">Minimum Share Difficulty</label>
        <div class="kr-mindiff-row">
          <input id="${INPUT_ID}" type="number" min="0.00000001" step="any" inputmode="decimal" value="${esc(formatDifficulty(minimum))}">
          <button id="${APPLY_ID}" type="button">Apply Difficulty</button>
        </div>
        <div class="kr-mindiff-presets">
          <button type="button" data-mindiff="0.0001">0.0001</button>
          <button type="button" data-mindiff="0.0007">NMMiner · 0.0007</button>
          <button type="button" data-mindiff="0.001">0.001</button>
          <button type="button" data-mindiff="0.01">0.01</button>
          <button type="button" data-mindiff="1">1</button>
          <button type="button" data-mindiff="1024">ASIC Default · 1024</button>
        </div>
        <div class="kr-mindiff-help">
          <strong>NMMiner (~1 MH/s):</strong> 0.0007 targets roughly one diff-floor share every few seconds. Lower difficulty increases share-processing traffic, so use the lowest value your miner actually needs. Applying this setting updates both CKPool <code>mindiff</code> and <code>startdiff</code> and reloads the pool.
        </div>
        <div id="${MESSAGE_ID}" class="kr-mindiff-message ${lastMessage ? (lastMessageGood ? "good" : "bad") : ""}">${esc(lastMessage)}</div>
      </div>
    `;
    return true;
  }

  async function ensureSettingsData(force = false) {
    if (settingsData && !force) return settingsData;
    if (settingsLoad && !force) return settingsLoad;
    settingsLoad = readJson("/api/settings", { cache: "no-store" })
      .then(data => {
        settingsData = data;
        return data;
      })
      .finally(() => { settingsLoad = null; });
    return settingsLoad;
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    window.requestAnimationFrame(async () => {
      applyQueued = false;
      if (!difficultyCard()) return;
      try {
        await ensureSettingsData(false);
        renderDifficultyCard();
      } catch (error) {
        setMessage(error?.message || "Unable to load mining difficulty settings.", false);
      }
    });
  }

  function approximatelyEqual(a, b) {
    const x = Number(a);
    const y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    return Math.abs(x - y) <= Math.max(1e-12, Math.abs(y) * 1e-9);
  }

  async function verifyMinimum(expected) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const data = await readJson("/api/settings", { cache: "no-store" });
      if (approximatelyEqual(currentMinimum(data), expected)) return data;
      await new Promise(resolve => window.setTimeout(resolve, 250));
    }
    throw new Error("Minimum difficulty was not confirmed after CKPool reload.");
  }

  async function applyMinimum() {
    if (applying) return;
    const input = document.getElementById(INPUT_ID);
    const button = document.getElementById(APPLY_ID);
    const minimum = finitePositive(input?.value);

    if (minimum === null) {
      setMessage("Enter a positive difficulty greater than zero.", false);
      input?.focus();
      return;
    }

    applying = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Applying…";
    }
    setMessage("Validating, saving, and reloading CKPool…", true);

    try {
      const current = await ensureSettingsData(true);
      const payout = String(
        current?.payout_address ?? current?.settings?.payout_address ?? ""
      ).trim();
      const network = String(
        current?.network ?? current?.settings?.network ?? "main"
      ).trim() || "main";

      const result = await readJson("/api/settings/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          network,
          payout_address: payout,
          minimum_share_difficulty: minimum,
        }),
      });

      if (result?.success !== true && result?.applied !== true) {
        const detail = result?.errors?.minimum_share_difficulty || result?.message || "Settings apply was not acknowledged.";
        throw new Error(detail);
      }

      settingsData = await verifyMinimum(minimum);
      setMessage(`Minimum share difficulty applied: ${formatDifficulty(minimum)}.`, true);
      const card = difficultyCard();
      if (card) delete card.dataset[CARD_MARKER];
      renderDifficultyCard();
      window.__KRASKUS_CHTA_LAST_MINDIFF_APPLY__ = {
        applied: true,
        minimum_share_difficulty: minimum,
        settings: settingsData,
      };
    } catch (error) {
      const message = error?.message || "Unable to apply minimum share difficulty.";
      setMessage(message, false);
      window.__KRASKUS_CHTA_LAST_MINDIFF_APPLY__ = {
        applied: false,
        minimum_share_difficulty: minimum,
        error: String(message),
      };
    } finally {
      applying = false;
      const liveButton = document.getElementById(APPLY_ID);
      if (liveButton) {
        liveButton.disabled = false;
        liveButton.textContent = "Apply Difficulty";
      }
    }
  }

  document.addEventListener("click", event => {
    const preset = event.target?.closest?.("[data-mindiff]");
    if (preset) {
      const input = document.getElementById(INPUT_ID);
      if (input) input.value = String(preset.dataset.mindiff || "");
      return;
    }

    if (event.target?.closest?.(`#${APPLY_ID}`)) {
      event.preventDefault();
      applyMinimum();
    }
  }, true);

  const observer = new MutationObserver(queueApply);
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", queueApply, { once: true });
  } else {
    queueApply();
  }

  window.__KRASKUS_CHTA_MINIMUM_DIFFICULTY_UI__ = "v3";
})();
