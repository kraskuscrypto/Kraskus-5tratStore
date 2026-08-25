(() => {
    "use strict";

    const currentSrc = document.currentScript?.src || window.location.href;
    const baseUrl = new URL("./", currentSrc);

    function findNotificationButton() {
        return [...document.querySelectorAll("button")].find((button) => {
            const text = (button.textContent || "").trim();
            return text === "Enable Browser Notifications" ||
                text.startsWith("Browser Notifications Unavailable") ||
                text.startsWith("Browser Notifications Blocked");
        }) || null;
    }

    function applyNotificationUx() {
        if (!document.body || !("Notification" in window)) return false;

        const button = findNotificationButton();
        if (!button) return false;

        if (!window.isSecureContext) {
            button.textContent = "Browser Notifications Unavailable — HTTPS Required";
            button.disabled = true;
            button.setAttribute("aria-disabled", "true");
            button.title = "Browser notifications require a secure HTTPS context.";
            button.dataset.kraskusNotificationState = "insecure-context";
            window.__KRASKUS_CHTA_NOTIFICATION_UX__ = "INSECURE_CONTEXT";
            return true;
        }

        if (Notification.permission === "denied") {
            button.textContent = "Browser Notifications Blocked — Check Browser Settings";
            button.disabled = true;
            button.setAttribute("aria-disabled", "true");
            button.title = "Browser notification permission is blocked in browser settings.";
            button.dataset.kraskusNotificationState = "permission-denied";
            window.__KRASKUS_CHTA_NOTIFICATION_UX__ = "PERMISSION_DENIED";
            return true;
        }

        button.removeAttribute("aria-disabled");
        button.dataset.kraskusNotificationState = Notification.permission;
        window.__KRASKUS_CHTA_NOTIFICATION_UX__ = Notification.permission.toUpperCase();
        return true;
    }

    function installNotificationObserver() {
        if (!document.body) return;

        applyNotificationUx();
        const observer = new MutationObserver(() => applyNotificationUx());
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        window.__KRASKUS_CHTA_NOTIFICATION_OBSERVER_V8__ = observer;

        for (const delay of [0, 50, 150, 350, 750, 1200]) {
            window.setTimeout(applyNotificationUx, delay);
        }
    }

    const legacyUrl = new URL("chta-ui-prepaint-v7.js", baseUrl).toString();
    const legacy = document.createElement("script");
    legacy.src = legacyUrl;
    legacy.async = false;
    legacy.dataset.kraskusPrepaint = "v7";
    legacy.addEventListener("load", () => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", installNotificationObserver, { once: true });
        } else {
            installNotificationObserver();
        }
    });
    document.head.appendChild(legacy);

    window.__KRASKUS_CHTA_PREPAINT_V8__ = true;
})();
