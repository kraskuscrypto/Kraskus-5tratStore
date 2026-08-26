(() => {
    "use strict";

    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);

    function loadScript(name, marker) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = new URL(name, baseUrl).toString();
            script.async = false;
            script.dataset.kraskusChain = marker;
            script.addEventListener("load", () => resolve(script), { once: true });
            script.addEventListener("error", () => reject(new Error(`Unable to load ${name}`)), { once: true });
            document.head.appendChild(script);
        });
    }

    loadScript("chta-ui-prepaint-v9.js", "prepaint-v9")
        .then(() => loadScript("chta-ui-hotfix-v2.js", "hotfix-v2"))
        .then(() => loadScript("chta-ui-hotfix-v3.js", "hotfix-v3"))
        .then(() => {
            window.__KRASKUS_CHTA_PREPAINT_V11_CHAIN__ = "PASS";
        })
        .catch(error => {
            window.__KRASKUS_CHTA_PREPAINT_V11_CHAIN__ = `FAIL: ${error.message}`;
            console.error("CHTA Candidate9 UI chain failed:", error);
        });

    window.__KRASKUS_CHTA_PREPAINT_V11__ = true;
})();
