(() => {
    "use strict";

    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);

    const legacyUrl = new URL("chta-ui-prepaint-v9.js", baseUrl).toString();
    const legacy = document.createElement("script");
    legacy.src = legacyUrl;
    legacy.async = false;
    legacy.dataset.kraskusPrepaint = "v9";

    legacy.addEventListener("load", () => {
        const hotfixUrl = new URL("chta-ui-hotfix-v2.js", baseUrl).toString();
        const hotfix = document.createElement("script");
        hotfix.src = hotfixUrl;
        hotfix.async = false;
        hotfix.dataset.kraskusHotfix = "v2";
        document.head.appendChild(hotfix);
    });

    document.head.appendChild(legacy);
    window.__KRASKUS_CHTA_PREPAINT_V10__ = true;
})();
