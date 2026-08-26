(() => {
    "use strict";

    const NOTES_ID = "krConnectOperationalNotes";
    const PREPAINT_ATTR = "data-kr-connect-prepaint-hidden";
    const TAB_NAMES = new Set(["overview", "fleet", "payouts", "connect", "settings"]);
    const STABILITY_DELAYS_MS = [0, 40, 100, 180, 320, 550];
    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);
    let connectKickQueued = false;
    let lastObservedTab = null;

    function directText(el) {
        return Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent || "")
            .join("")
            .trim();
    }

    function findExactText(root, label) {
        for (const node of root.querySelectorAll("*")) {
            if (node.textContent.trim() === label || directText(node) === label) return node;
        }
        return null;
    }

    function ancestorContaining(node, requiredTexts, maxDepth = 10) {
        let current = node;
        for (let depth = 0; current && depth < maxDepth; depth += 1) {
            const text = current.textContent || "";
            if (requiredTexts.every(value => text.includes(value))) return current;
            current = current.parentElement;
        }
        return null;
    }

    function replaceStaleSettingsCopy() {
        const stale = "Unavailable in v0.1.0-beta. The current chain is small enough that preserving complete history is preferable.";
        const replacement = "Not currently available. Full-history mode is the qualified CHTA Solo storage policy.";
        for (const node of document.querySelectorAll("*")) {
            if (node.children.length !== 0) continue;
            if (node.textContent.trim() !== stale) continue;
            node.textContent = replacement;
            window.__KRASKUS_CHTA_SETTINGS_COPY_FIX__ = "PASS";
        }
    }

    function normalizeTab(value) {
        const normalized = String(value || "").trim().toLowerCase();
        return TAB_NAMES.has(normalized) ? normalized : null;
    }

    function tabFromNode(node) {
        let current = node instanceof Element ? node : null;
        for (let depth = 0; current && depth < 5; depth += 1) {
            const tab = normalizeTab(directText(current) || current.textContent);
            if (tab) return tab;
            current = current.parentElement;
        }
        return null;
    }

    function detectActiveTab() {
        for (const node of document.querySelectorAll('[aria-selected="true"], .is-active, .active')) {
            const tab = normalizeTab(directText(node) || node.textContent);
            if (tab) return tab;
        }
        return null;
    }

    function findBuilder() {
        const marker = findExactText(document, "CONNECTION BUILDER");
        return marker ? ancestorContaining(marker, ["Miner Identity", "Copy All Settings"], 9) : null;
    }

    function hideQuickSetup() {
        const marker = findExactText(document, "QUICK SETUP");
        if (!marker) return;
        const panel = ancestorContaining(
            marker,
            ["Bitaxe / AxeOS", "Bitmain Antminer", "WhatsMiner", "Generic SHA256"],
            10
        );
        if (!panel || panel.hidden) return;
        panel.hidden = true;
        panel.setAttribute("aria-hidden", "true");
        panel.style.setProperty("display", "none", "important");
    }

    function compatReady() {
        const version = String(window.__KRASKUS_CHTA_COMPAT_VERSION__ || "");
        return (
            window.__KRASKUS_CHTA_PREFIXED_OVERVIEW_BOOTSTRAP__ === "PASS" &&
            (version === "v6" || version === "v7")
        );
    }

    function kickCompat(tab, reason) {
        if (!compatReady()) return;
        document.dispatchEvent(new Event("input", { bubbles: true }));
        replaceStaleSettingsCopy();
        const counters = window.__KRASKUS_CHTA_TAB_STABILITY_KICKS__ || {};
        counters[tab || "unknown"] = (counters[tab || "unknown"] || 0) + 1;
        window.__KRASKUS_CHTA_TAB_STABILITY_KICKS__ = counters;
        window.__KRASKUS_CHTA_LAST_TAB_STABILITY_KICK__ = {
            tab: tab || "unknown",
            reason,
            at: Date.now()
        };
    }

    function scheduleTabStability(tab, reason = "navigation") {
        if (!tab) return;
        window.__KRASKUS_CHTA_LAST_TAB_TRANSITION__ = { tab, reason, at: Date.now() };
        for (const delay of STABILITY_DELAYS_MS) {
            window.setTimeout(() => {
                kickCompat(tab, `${reason}:${delay}`);
                if (tab === "connect") reconcileConnectPaint();
                if (tab === "settings") replaceStaleSettingsCopy();
            }, delay);
        }
    }

    function scheduleConnectCompatKick() {
        if (connectKickQueued) return;
        if (!compatReady()) return;
        if (document.getElementById(NOTES_ID)) return;
        if (!findBuilder()) return;
        connectKickQueued = true;
        window.requestAnimationFrame(() => {
            connectKickQueued = false;
            if (document.getElementById(NOTES_ID)) return;
            kickCompat("connect", "dom-race");
            window.__KRASKUS_CHTA_DOM_RACE_KICK__ = (window.__KRASKUS_CHTA_DOM_RACE_KICK__ || 0) + 1;
        });
    }

    function reconcileConnectPaint() {
        hideQuickSetup();
        const builder = findBuilder();
        if (!builder) return;
        const adaptedReady = Boolean(document.getElementById(NOTES_ID));
        if (!adaptedReady) {
            if (builder.getAttribute(PREPAINT_ATTR) !== "1") {
                builder.setAttribute(PREPAINT_ATTR, "1");
                builder.style.setProperty("visibility", "hidden", "important");
                builder.style.setProperty("pointer-events", "none", "important");
            }
            scheduleConnectCompatKick();
            return;
        }
        if (builder.getAttribute(PREPAINT_ATTR) === "1") {
            builder.removeAttribute(PREPAINT_ATTR);
            builder.style.removeProperty("visibility");
            builder.style.removeProperty("pointer-events");
        }
    }

    function observeActiveTab() {
        const tab = detectActiveTab();
        if (!tab || tab === lastObservedTab) return;
        lastObservedTab = tab;
        scheduleTabStability(tab, "active-tab-change");
    }

    function installObserver() {
        if (!document.body) return;
        document.addEventListener("click", event => {
            const tab = tabFromNode(event.target);
            if (tab) scheduleTabStability(tab, "tab-click");
        }, true);

        const observer = new MutationObserver(() => {
            reconcileConnectPaint();
            scheduleConnectCompatKick();
            observeActiveTab();
            replaceStaleSettingsCopy();
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "aria-selected", "hidden"]
        });

        reconcileConnectPaint();
        observeActiveTab();
        replaceStaleSettingsCopy();
        window.__KRASKUS_CHTA_ALL_TAB_STABILITY_OBSERVER__ = observer;
    }

    function bootstrapOverview() {
        const overviewUrl = new URL("api/overview", baseUrl).toString();
        window.__KRASKUS_CHTA_PREFIXED_OVERVIEW_URL__ = overviewUrl;
        return window.fetch(overviewUrl, { cache: "no-store" })
            .then(response => {
                if (!response.ok) throw new Error(`overview HTTP ${response.status}`);
                return response;
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", installObserver, { once: true });
    } else {
        installObserver();
    }

    const compatUrl = new URL("chta-ui-compat-v6.js", baseUrl).toString();
    const script = document.createElement("script");
    script.src = compatUrl;
    script.async = false;
    script.dataset.kraskusCompat = "v6";
    script.addEventListener("load", () => {
        reconcileConnectPaint();
        bootstrapOverview()
            .then(() => {
                window.__KRASKUS_CHTA_PREFIXED_OVERVIEW_BOOTSTRAP__ = "PASS";
                reconcileConnectPaint();
                scheduleConnectCompatKick();
                replaceStaleSettingsCopy();
                const tab = detectActiveTab() || "overview";
                scheduleTabStability(tab, "bootstrap");
            })
            .catch(error => {
                window.__KRASKUS_CHTA_PREFIXED_OVERVIEW_BOOTSTRAP__ = `FAIL: ${error.message}`;
                console.error("CHTA prefixed overview bootstrap failed:", error);
            });
    });
    document.head.appendChild(script);

    window.__KRASKUS_CHTA_PREPAINT_V5__ = true;
})();
