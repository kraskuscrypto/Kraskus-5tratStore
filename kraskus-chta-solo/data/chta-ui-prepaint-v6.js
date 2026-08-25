(() => {
    "use strict";

    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);
    const STALE = "Unavailable in v0.1.0-beta. The current chain is small enough that preserving complete history is preferable.";
    const REPLACEMENT = "Not currently available. Full-history mode is the qualified CHTA Solo storage policy.";

    function replaceStaleSettingsCopy() {
        if (!document.body) return 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        let replacements = 0;
        while ((node = walker.nextNode())) {
            const value = node.nodeValue || "";
            if (!value.includes(STALE)) continue;
            node.nodeValue = value.replaceAll(STALE, REPLACEMENT);
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
        window.__KRASKUS_CHTA_SETTINGS_COPY_OBSERVER__ = observer;
    }

    const legacyUrl = new URL("chta-ui-prepaint-v5.js", baseUrl).toString();
    const legacy = document.createElement("script");
    legacy.src = legacyUrl;
    legacy.async = false;
    legacy.dataset.kraskusPrepaint = "v5";
    legacy.addEventListener("load", () => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", installCopyObserver, { once: true });
        } else {
            installCopyObserver();
        }
        window.setTimeout(replaceStaleSettingsCopy, 0);
        window.setTimeout(replaceStaleSettingsCopy, 100);
        window.setTimeout(replaceStaleSettingsCopy, 300);
        window.setTimeout(replaceStaleSettingsCopy, 700);
    });
    document.head.appendChild(legacy);

    window.__KRASKUS_CHTA_PREPAINT_V6__ = true;
})();
