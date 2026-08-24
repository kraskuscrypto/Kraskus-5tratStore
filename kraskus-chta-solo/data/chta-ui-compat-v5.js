(() => {
    "use strict";

    const COMPAT_HEADER = "X-Kraskus-Overview-Compatibility";
    const ROUND_UNAVAILABLE = "round-unavailable";
    const CONNECT_NOTES_ID = "krConnectOperationalNotes";
    const CONNECT_STYLE_ID = "krConnectCompatStyles";

    let lastOverview = null;
    let roundUnavailable = false;
    let applyQueued = false;

    const $ = id => document.getElementById(id);

    function booleanValue(value, fallback = false) {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value !== 0;
        if (typeof value === "string") {
            const normalized = value.trim().toLowerCase();
            if (["true", "1", "yes", "ready", "online"].includes(normalized)) return true;
            if (["false", "0", "no", "offline", "waiting"].includes(normalized)) return false;
        }
        return fallback;
    }

    function setText(id, value) {
        const el = $(id);
        if (!el) return;
        const next = String(value);
        if (el.textContent !== next) el.textContent = next;
    }

    function setStatusPill(text, className) {
        const el = $("appStatus");
        if (!el) return;
        el.className = "zec-status-pill " + className;
        el.textContent = text;
    }

    function setMachineState(text, good) {
        const el = $("machineNetworkState");
        if (!el) return;
        el.textContent = text;
        el.style.color = good ? "var(--green)" : "var(--gold-hi)";
    }

    function readinessTruth(data) {
        const status = data?.status || {};
        const readiness = data?.readiness || {};
        const checks = readiness.checks || {};
        const node = status.node || readiness.node || {};
        const state = String(readiness.state || status.state || "").toUpperCase();
        const readyToMine = booleanValue(readiness.ready_to_mine, false);
        const chainSynced = booleanValue(
            readiness.chain_synced,
            booleanValue(checks.chain_synced, false)
        );
        const payoutConfigured = booleanValue(
            readiness.payout_configured,
            booleanValue(checks.payout_configured, false)
        );
        const stratumOnline = booleanValue(checks.stratum_online, false);
        const miningEngineReady = booleanValue(checks.mining_engine_ready, false);
        const payoutAddress = String(
            readiness.payout_address || status.payout_address || ""
        ).trim();

        return {
            status,
            readiness,
            checks,
            node,
            state,
            readyToMine,
            chainSynced,
            payoutConfigured,
            stratumOnline,
            miningEngineReady,
            payoutAddress,
        };
    }

    function applyLegacyState(data) {
        if (!data || typeof data !== "object") return;

        const truth = readinessTruth(data);
        const { status, readiness, node, state, readyToMine, chainSynced, payoutConfigured } = truth;
        const syncPercent = Number(node.sync_percent);
        const peers = Number(node.peers);
        const network = node.network || status.network || readiness.network || "";
        const workers = data.workers || {};
        const blocks = data.blocks || {};
        const workerList = Array.isArray(workers.workers) ? workers.workers : [];
        const minerCountRaw = workers.count;
        const minerCount = Number.isFinite(Number(minerCountRaw))
            ? Number(minerCountRaw)
            : workerList.length;
        const shareCountRaw = workers.total_shares;
        const shareCount = Number.isFinite(Number(shareCountRaw))
            ? Number(shareCountRaw)
            : workerList.reduce(
                (sum, worker) => sum + Number(worker.accepted_shares ?? worker.shares ?? 0),
                0
            );
        const blockList = Array.isArray(blocks.blocks) ? blocks.blocks : [];
        const blockCountRaw = blocks.count;
        const blockCount = Number.isFinite(Number(blockCountRaw))
            ? Number(blockCountRaw)
            : blockList.length;

        if (readyToMine) {
            setStatusPill("Ready", "zec-status-ready");
            setMachineState("READY", true);
        } else if (state === "SYNCING" || !chainSynced) {
            setStatusPill("Syncing", "zec-status-syncing");
            setMachineState("SYNCING", false);
        } else if (!payoutConfigured) {
            setStatusPill("Setup Required", "zec-status-setup");
            setMachineState("SETUP REQUIRED", false);
        } else {
            setStatusPill("Waiting", "zec-status-syncing");
            setMachineState("WAITING", false);
        }

        setText("machineSync", Number.isFinite(syncPercent) ? syncPercent.toFixed(2) + "%" : "—");
        setText("machineMiners", minerCount);
        setText("machineShares", shareCount);
        setText("machineBlocks", blockCount);
        setText(
            "networkStatus",
            network
                ? network + " · " + (Number.isFinite(peers) ? peers : 0) + " peers"
                : "Waiting for node"
        );
        setText("heroChainState", chainSynced ? "READY" : "SYNCING");
    }

    function directText(el) {
        return Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent || "")
            .join("")
            .trim();
    }

    function findExactText(root, label) {
        const nodes = root.querySelectorAll("*");
        for (const node of nodes) {
            if (node.textContent.trim() === label || directText(node) === label) return node;
        }
        return null;
    }

    function blankSiblingValue(root, label) {
        const labelEl = findExactText(root, label);
        if (!labelEl) return;
        const valueEl = labelEl.nextElementSibling;
        if (!valueEl) return;
        const current = valueEl.textContent.trim();
        if (["0", "0s", "0.00%"].includes(current)) valueEl.textContent = "—";
    }

    function applyRoundUnavailable() {
        if (!roundUnavailable) return;
        const surface = $("krOverviewV3");
        if (!surface) return;
        for (const label of ["ROUND BEST", "BLOCK THRESHOLD", "ROUND SHARES", "ROUND AGE"]) {
            blankSiblingValue(surface, label);
        }
    }

    function hideElement(el) {
        if (!el) return;
        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        el.style.setProperty("display", "none", "important");
    }

    function suppressLegacyConnectPanel() {
        document.querySelectorAll(".kr-connect-v2-host").forEach(hideElement);
    }

    function suppressLegacyReadinessPanel() {
        hideElement($("readyNode")?.closest(".zec-panel"));
    }

    function ancestorContaining(node, requiredTexts, maxDepth = 8) {
        let current = node;
        for (let depth = 0; current && depth < maxDepth; depth += 1) {
            const text = current.textContent || "";
            if (requiredTexts.every(value => text.includes(value))) return current;
            current = current.parentElement;
        }
        return null;
    }

    function suppressRedundantQuickSetup() {
        const marker = findExactText(document, "QUICK SETUP");
        if (!marker) return;
        const panel = ancestorContaining(
            marker,
            ["Bitaxe / AxeOS", "Bitmain Antminer", "WhatsMiner", "Generic SHA256"],
            10
        );
        hideElement(panel);
    }

    function installConnectStyles() {
        if ($(CONNECT_STYLE_ID)) return;
        const style = document.createElement("style");
        style.id = CONNECT_STYLE_ID;
        style.textContent = `
            #${CONNECT_NOTES_ID} {
                margin-top: 12px;
                border: 1px solid rgba(255,255,255,.08);
                border-radius: 14px;
                background: rgba(255,255,255,.018);
                padding: 16px 18px;
            }
            #${CONNECT_NOTES_ID} .kr-connect-ready-line {
                display: flex;
                align-items: center;
                gap: 9px;
                padding: 10px 12px;
                margin-bottom: 14px;
                border-radius: 10px;
                font-weight: 700;
                letter-spacing: .01em;
            }
            #${CONNECT_NOTES_ID} .kr-connect-ready-line.ready {
                color: var(--green);
                border: 1px solid rgba(27,220,139,.25);
                background: rgba(27,220,139,.06);
            }
            #${CONNECT_NOTES_ID} .kr-connect-ready-line.waiting {
                color: var(--gold-hi);
                border: 1px solid rgba(255,187,46,.22);
                background: rgba(255,187,46,.05);
            }
            #${CONNECT_NOTES_ID} .kr-connect-notes-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
                margin-bottom: 14px;
            }
            #${CONNECT_NOTES_ID} .kr-connect-note-stat {
                padding: 10px 12px;
                border: 1px solid rgba(255,255,255,.06);
                border-radius: 9px;
                min-width: 0;
            }
            #${CONNECT_NOTES_ID} .kr-connect-note-label {
                display: block;
                color: #83919a;
                font-size: 10px;
                letter-spacing: .11em;
                text-transform: uppercase;
                margin-bottom: 4px;
            }
            #${CONNECT_NOTES_ID} .kr-connect-note-value {
                color: #f3f6f7;
                font-size: 13px;
                font-weight: 700;
            }
            #${CONNECT_NOTES_ID} .kr-connect-help {
                color: #98a5ad;
                font-size: 12px;
                line-height: 1.65;
            }
            #${CONNECT_NOTES_ID} .kr-connect-help strong {
                color: #dfe6e9;
                font-weight: 700;
            }
            #${CONNECT_NOTES_ID} .kr-connect-ip-tip {
                margin-top: 8px;
                color: #c8a843;
            }
            button[aria-disabled="true"] {
                opacity: .45;
                cursor: not-allowed !important;
            }
            @media (max-width: 900px) {
                #${CONNECT_NOTES_ID} .kr-connect-notes-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            @media (max-width: 560px) {
                #${CONNECT_NOTES_ID} .kr-connect-notes-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function findConnectionBuilderPanel() {
        const marker = findExactText(document, "CONNECTION BUILDER");
        if (!marker) return null;
        return ancestorContaining(marker, ["Miner Identity", "Copy All Settings"], 9);
    }

    function workerName() {
        const marker = findExactText(document, "WORKER NAME");
        if (!marker) return "worker";
        let current = marker.parentElement;
        for (let depth = 0; current && depth < 5; depth += 1) {
            const input = current.querySelector("input");
            if (input) return String(input.value || "worker").trim() || "worker";
            current = current.parentElement;
        }
        return "worker";
    }

    function connectionValues(truth) {
        const host = window.location.hostname || "5tratumOS-host";
        const worker = workerName();
        return {
            url: `stratum+tcp://${host}:3336`,
            username: truth.payoutConfigured && truth.payoutAddress
                ? `${truth.payoutAddress}.${worker}`
                : "",
            password: "x",
        };
    }

    function connectButtons(builder) {
        const buttons = Array.from(builder?.querySelectorAll("button") || []);
        const copyButtons = buttons.filter(button => button.textContent.trim() === "Copy");
        return {
            url: copyButtons[0] || null,
            username: copyButtons[1] || null,
            password: copyButtons[2] || null,
            all: buttons.find(button => button.textContent.trim() === "Copy All Settings") || null,
        };
    }

    function setButtonEnabled(button, enabled) {
        if (!button) return;
        button.disabled = !enabled;
        button.setAttribute("aria-disabled", enabled ? "false" : "true");
    }

    function setConnectionCopyState(truth) {
        const builder = findConnectionBuilderPanel();
        if (!builder) return;

        const buttons = connectButtons(builder);
        setButtonEnabled(buttons.url, true);
        setButtonEnabled(buttons.password, true);
        setButtonEnabled(buttons.username, truth.payoutConfigured && Boolean(truth.payoutAddress));
        setButtonEnabled(buttons.all, truth.payoutConfigured && Boolean(truth.payoutAddress));

        const placeholder = findExactText(builder, "YOUR_CHTA_ADDRESS.worker");
        if (placeholder && !truth.payoutConfigured) {
            placeholder.textContent = "Configure payout address first";
        }
    }

    function connectionStateMessage(truth) {
        if (truth.readyToMine) {
            return "Node, payout, Stratum, and mining engine are ready.";
        }
        const reasons = [];
        if (!truth.chainSynced) reasons.push("node is synchronizing");
        if (!truth.payoutConfigured) reasons.push("payout is not configured");
        if (!truth.stratumOnline) reasons.push("Stratum is offline");
        if (!truth.miningEngineReady && truth.chainSynced && truth.payoutConfigured) {
            reasons.push("mining engine is not ready");
        }
        if (!reasons.length) return "Waiting for appliance readiness.";
        const sentence = reasons.join(" and ");
        return sentence.charAt(0).toUpperCase() + sentence.slice(1) + ".";
    }

    function renderConnectNotes(truth) {
        const builder = findConnectionBuilderPanel();
        if (!builder) return;

        installConnectStyles();

        let notes = $(CONNECT_NOTES_ID);
        if (!notes) {
            notes = document.createElement("section");
            notes.id = CONNECT_NOTES_ID;
            builder.insertAdjacentElement("afterend", notes);
        }

        const host = window.location.hostname || "5tratumOS host";
        const readyClass = truth.readyToMine ? "ready" : "waiting";
        const readyLabel = truth.readyToMine ? "READY TO MINE" : "NOT READY TO MINE";

        notes.innerHTML = `
            <div class="kr-connect-ready-line ${readyClass}">
                <span>${readyLabel}</span>
                <span>—</span>
                <span>${connectionStateMessage(truth)}</span>
            </div>
            <div class="kr-connect-notes-grid">
                <div class="kr-connect-note-stat">
                    <span class="kr-connect-note-label">Network</span>
                    <span class="kr-connect-note-value">CheetahCoin Mainnet</span>
                </div>
                <div class="kr-connect-note-stat">
                    <span class="kr-connect-note-label">Algorithm</span>
                    <span class="kr-connect-note-value">SHA256</span>
                </div>
                <div class="kr-connect-note-stat">
                    <span class="kr-connect-note-label">Mining Mode</span>
                    <span class="kr-connect-note-value">Solo</span>
                </div>
                <div class="kr-connect-note-stat">
                    <span class="kr-connect-note-label">Stratum Port</span>
                    <span class="kr-connect-note-value">3336</span>
                </div>
            </div>
            <div class="kr-connect-help">
                <div><strong>Worker identity:</strong> your miner username is your configured CHTA payout address plus an optional worker name, for example <code>CHTA_ADDRESS.worker</code>.</div>
                <div><strong>Payout:</strong> solo block rewards are directed to the CHTA payout address configured in Settings.</div>
                <div><strong>Password:</strong> use <code>x</code> as the standard Stratum password placeholder.</div>
                <div><strong>Compatibility:</strong> works with standard SHA256 Stratum miners including Bitaxe/AxeOS, Antminer, and WhatsMiner.</div>
                <div class="kr-connect-ip-tip"><strong>Keep this address stable:</strong> the current miner host is <code>${host}:3336</code>. Reserve this 5tratumOS IP in your router/DHCP server so miner connections do not break after an address change.</div>
            </div>
        `;

        setConnectionCopyState(truth);
    }

    function fallbackCopy(text) {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        area.style.top = "0";
        document.body.appendChild(area);
        area.focus();
        area.select();
        let ok = false;
        try {
            ok = document.execCommand("copy");
        } finally {
            document.body.removeChild(area);
        }
        return ok;
    }

    function copyText(text) {
        if (!text) return Promise.resolve(false);
        if (window.isSecureContext && navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(text)
                .then(() => true)
                .catch(() => fallbackCopy(text));
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function flashCopyResult(button, ok) {
        if (!button) return;
        const original = button.dataset.krOriginalLabel || button.textContent.trim();
        button.dataset.krOriginalLabel = original;
        button.textContent = ok ? "Copied" : "Copy failed";
        window.setTimeout(() => {
            if (button.isConnected) button.textContent = original;
        }, 1200);
    }

    function handleConnectCopyClick(event) {
        const button = event.target?.closest?.("button");
        if (!button) return;
        const builder = findConnectionBuilderPanel();
        if (!builder || !builder.contains(button)) return;

        const buttons = connectButtons(builder);
        if (![buttons.url, buttons.username, buttons.password, buttons.all].includes(button)) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const truth = readinessTruth(lastOverview || {});
        const values = connectionValues(truth);
        let value = "";

        if (button === buttons.url) value = values.url;
        if (button === buttons.username) value = values.username;
        if (button === buttons.password) value = values.password;
        if (button === buttons.all && values.username) {
            value = [
                `Stratum URL: ${values.url}`,
                `Username / Worker: ${values.username}`,
                `Password: ${values.password}`,
            ].join("\n");
        }

        if (!value) return;
        copyText(value).then(ok => {
            window.__KRASKUS_CHTA_LAST_COPY__ = ok ? value : null;
            flashCopyResult(button, ok);
        });
    }

    function applyConnectEnhancements() {
        suppressRedundantQuickSetup();
        if (!lastOverview) return;
        renderConnectNotes(readinessTruth(lastOverview));
    }

    function apply() {
        applyQueued = false;
        suppressLegacyConnectPanel();
        suppressLegacyReadinessPanel();
        suppressRedundantQuickSetup();
        if (lastOverview) applyLegacyState(lastOverview);
        applyRoundUnavailable();
        applyConnectEnhancements();
    }

    function queueApply() {
        if (applyQueued) return;
        applyQueued = true;
        window.requestAnimationFrame(apply);
    }

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        try {
            const input = args[0];
            const rawUrl = typeof input === "string" ? input : input?.url;
            const url = new URL(rawUrl, window.location.href);
            if (url.pathname.endsWith("/api/overview")) {
                const cloned = response.clone();
                lastOverview = await cloned.json();
                roundUnavailable = response.headers.get(COMPAT_HEADER) === ROUND_UNAVAILABLE;
                queueApply();
            }
        } catch (error) {
            console.debug("CHTA compatibility overlay:", error);
        }
        return response;
    };

    function installRoundObserver() {
        const surface = $("krOverviewV3");
        if (!surface) return;
        const observer = new MutationObserver(() => {
            window.requestAnimationFrame(applyRoundUnavailable);
        });
        observer.observe(surface, { childList: true, subtree: true });
    }

    function installCompatDomOwnership() {
        suppressLegacyConnectPanel();
        suppressLegacyReadinessPanel();
        suppressRedundantQuickSetup();
        installRoundObserver();

        document.addEventListener("click", handleConnectCopyClick, true);
        document.addEventListener("click", () => {
            window.setTimeout(queueApply, 0);
        });
        document.addEventListener("input", () => {
            window.setTimeout(queueApply, 0);
        });

        window.setTimeout(queueApply, 0);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installCompatDomOwnership, { once: true });
    } else {
        installCompatDomOwnership();
    }

    originalFetch("/api/overview", { cache: "no-store" })
        .then(async response => {
            lastOverview = await response.clone().json();
            roundUnavailable = response.headers.get(COMPAT_HEADER) === ROUND_UNAVAILABLE;
            queueApply();
        })
        .catch(() => {});

    window.__KRASKUS_CHTA_COMPAT_V1__ = true;
})();
