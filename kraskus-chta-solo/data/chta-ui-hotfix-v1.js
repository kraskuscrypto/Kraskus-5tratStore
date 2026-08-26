(() => {
  "use strict";

  if (window.__KRASKUS_CHTA_HOTFIX_V1__) return;
  window.__KRASKUS_CHTA_HOTFIX_V1__ = true;

  let workersData = null;
  let roundData = null;
  let applyQueued = false;

  const originalFetchBeforeHotfix = window.fetch.bind(window);

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function directText(el) {
    return Array.from(el.childNodes)
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

  function unix(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }

  function ageText(value) {
    const ts = unix(value);
    if (!ts) return "—";
    const seconds = Math.max(0, Math.floor(Date.now() / 1000) - ts);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function compact(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1e12) return `${(n / 1e12).toFixed(2).replace(/\.00$/, "")}T`;
    if (abs >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, "")}B`;
    if (abs >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.00$/, "")}M`;
    if (abs >= 1e3) return `${(n / 1e3).toFixed(2).replace(/\.00$/, "")}K`;
    return n.toFixed(2).replace(/\.00$/, "");
  }

  function workerLabel(worker) {
    const full = String(worker?.name || worker?.worker || "Unknown");
    const dot = full.lastIndexOf(".");
    return dot >= 0 && dot < full.length - 1 ? full.slice(dot + 1) : full;
  }

  function currentRoundLastShare() {
    const explicit = unix(roundData?.last_share_at);
    if (explicit) return explicit;

    const started = unix(roundData?.round?.started_at);
    if (!started) return null;

    const workers = Array.isArray(workersData?.workers) ? workersData.workers : [];
    const candidates = workers
      .map(worker => unix(worker?.last_share_at ?? worker?.last_share))
      .filter(ts => ts && ts >= started);

    return candidates.length ? Math.max(...candidates) : null;
  }

  function patchOverviewLastShare() {
    const surface = document.getElementById("krOverviewV3");
    if (!surface) return;
    const label = findExactText(surface, "LAST SHARE");
    if (!label) return;
    const value = label.nextElementSibling;
    if (!value) return;
    value.textContent = ageText(currentRoundLastShare());
  }

  function workerBestRows() {
    const workers = Array.isArray(workersData?.workers) ? workersData.workers : [];
    return workers
      .map(worker => ({
        worker: workerLabel(worker),
        difficulty: Number(worker?.best_share ?? worker?.best_ever),
        lastShare: unix(worker?.last_share_at ?? worker?.last_share),
      }))
      .filter(row => Number.isFinite(row.difficulty) && row.difficulty > 0)
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 10);
  }

  function patchFleetLeaderboard() {
    const section = document.querySelector(".kr-fleet-top10");
    if (!section || !workersData) return;

    const realSubmissions = Array.isArray(workersData.top_difficulty_submissions)
      ? workersData.top_difficulty_submissions
      : [];

    if (realSubmissions.length) return;

    const heading = section.querySelector("h2");
    const description = section.querySelector(".kr-fleet-top10-head p");
    const table = section.querySelector(".kr-fleet-top10-table");
    if (!table) return;

    if (heading) heading.textContent = "Worker Best Difficulty Leaderboard";
    if (description) {
      description.textContent = "Highest best-share difficulty currently reported for each worker in this CHTA Solo fleet.";
    }

    const rows = workerBestRows();

    table.innerHTML = `
      <div class="kr-fleet-top10-row header">
        <span>#</span>
        <span>DIFFICULTY</span>
        <span>WORKER</span>
        <span>LAST SHARE</span>
      </div>
      ${rows.length ? rows.map((row, index) => `
        <div class="kr-fleet-top10-row">
          <span class="rank">${index + 1}</span>
          <strong class="difficulty">${esc(compact(row.difficulty))}</strong>
          <span class="worker">${esc(row.worker)}</span>
          <span class="submitted">${esc(ageText(row.lastShare))}</span>
        </div>
      `).join("") : `
        <div class="kr-fleet-top10-empty">
          Waiting for worker best-difficulty telemetry…
        </div>
      `}
    `;
  }

  function apply() {
    applyQueued = false;
    patchOverviewLastShare();
    patchFleetLeaderboard();
  }

  function queueApply() {
    if (applyQueued) return;
    applyQueued = true;
    requestAnimationFrame(apply);
  }

  async function captureResponse(url, response) {
    try {
      const href = typeof url === "string" ? url : String(url?.url || "");
      if (!href.includes("/api/workers") && !href.includes("/api/round")) return;
      const data = await response.clone().json();
      if (href.includes("/api/workers")) workersData = data;
      if (href.includes("/api/round")) roundData = data;
      queueApply();
    } catch (_) {}
  }

  window.fetch = async function hotfixFetch(input, init) {
    const response = await originalFetchBeforeHotfix(input, init);
    captureResponse(input, response);
    return response;
  };

  const observer = new MutationObserver(queueApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  Promise.all([
    originalFetchBeforeHotfix("/api/workers", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) workersData = data; })
      .catch(() => {}),
    originalFetchBeforeHotfix("/api/round", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) roundData = data; })
      .catch(() => {}),
  ]).finally(queueApply);

  const compat = document.createElement("script");
  compat.src = "/static/chta-ui-compat-v7.js";
  compat.async = false;
  document.head.appendChild(compat);
})();
