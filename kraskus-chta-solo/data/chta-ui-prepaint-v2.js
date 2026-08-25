(() => {
    "use strict";

    const NOTES_ID = "krConnectOperationalNotes";
    const PREPAINT_ATTR = "data-kr-connect-prepaint-hidden";
    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);

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
            return;
        }

        if (builder.getAttribute(PREPAINT_ATTR) === "1") {
            builder.removeAttribute(PREPAINT_ATTR);
            builder.style.removeProperty("visibility");
            builder.style.removeProperty("pointer-events");
        }
    }

    function installObserver() {
        if (!document.body) return;
        const observer = new MutationObserver(reconcileConnectPaint);
        observer.observe(document.body, { childList: true, subtree: true });
        reconcileConnectPaint();
        window.__KRASKUS_CHTA_CONNECT_PREPAINT_OBSERVER__ = observer;
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
                window.setTimeout(reconcileConnectPaint, 0);
                window.setTimeout(reconcileConnectPaint, 50);
                window.setTimeout(reconcileConnectPaint, 250);
            })
            .catch(error => {
                window.__KRASKUS_CHTA_PREFIXED_OVERVIEW_BOOTSTRAP__ = `FAIL: ${error.message}`;
                console.error("CHTA prefixed overview bootstrap failed:", error);
            });
    });
    document.head.appendChild(script);

    window.__KRASKUS_CHTA_PREPAINT_V2__ = true;
})();
