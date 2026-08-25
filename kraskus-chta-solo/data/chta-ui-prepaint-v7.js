(() => {
    "use strict";

    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);
    const START = "Unavailable in v0.1.0-beta.";
    const END = "preserving complete history is preferable.";
    const REPLACEMENT = "Not currently available. Full-history mode is the qualified CHTA Solo storage policy.";

    function normalizeWhitespace(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function replaceStaleSettingsCopy() {
        if (!document.body) return 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        let replacements = 0;

        while ((node = walker.nextNode())) {
            const raw = node.nodeValue || "";
            const normalized = normalizeWhitespace(raw);
            if (!normalized.includes(START) || !normalized.includes(END)) continue;

            node.nodeValue = ` ${REPLACEMENT} `;
            replacements += 1;
        }

        if (replacements > 0) {
            window.__KRASKUS_CHTA_SETTINGS_COPY_FIX__ = "PASS";
            window.__KRASKUS_CHTA_SETTINGS_COPY_FIX_COUNT__ =
                (window.__KRASKUS_CHTA_SETTINGS_COPY_FIX_COUNT__ || 0) + replacements;
        }
        return replacements;
    }

    function installCopyObserver() {
        if (!document.body) return;
        replaceStaleSettingsCopy();
        const observer = new MutationObserver(() => replaceStaleSettingsCopy());
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
        window.__KRASKUS_CHTA_SETTINGS_COPY_OBSERVER_V7__ = observer;
    }

    const legacyUrl = new URL("chta-ui-prepaint-v6.js", baseUrl).toString();
    const legacy = document.createElement("script");
    legacy.src = legacyUrl;
    legacy.async = false;
    legacy.dataset.kraskusPrepaint = "v6";
    legacy.addEventListener("load", () => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", installCopyObserver, { once: true });
        } else {
            installCopyObserver();
        }
        for (const delay of [0, 50, 150, 350, 750, 1200]) {
            window.setTimeout(replaceStaleSettingsCopy, delay);
        }
    });
    document.head.appendChild(legacy);

    window.__KRASKUS_CHTA_PREPAINT_V7__ = true;
})();
