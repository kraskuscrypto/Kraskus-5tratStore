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

    function setButtonState(button, { text, disabled, title, state }) {
        let changed = false;

        if ((button.textContent || "").trim() !== text) {
            button.textContent = text;
            changed = true;
        }
        if (button.disabled !== disabled) {
            button.disabled = disabled;
            changed = true;
        }
        const aria = disabled ? "true" : null;
        if (aria === null) {
            if (button.hasAttribute("aria-disabled")) {
                button.removeAttribute("aria-disabled");
                changed = true;
            }
        } else if (button.getAttribute("aria-disabled") !== aria) {
            button.setAttribute("aria-disabled", aria);
            changed = true;
        }
        if (button.title !== title) {
            button.title = title;
            changed = true;
        }
        if (button.dataset.kraskusNotificationState !== state) {
            button.dataset.kraskusNotificationState = state;
            changed = true;
        }

        return changed;
    }

    function applyNotificationUx() {
        if (!document.body || !("Notification" in window)) return false;

        const button = findNotificationButton();
        if (!button) return false;

        if (!window.isSecureContext) {
            setButtonState(button, {
                text: "Browser Notifications Unavailable — HTTPS Required",
                disabled: true,
                title: "Browser notifications require a secure HTTPS context.",
                state: "insecure-context"
            });
            window.__KRASKUS_CHTA_NOTIFICATION_UX__ = "INSECURE_CONTEXT";
            return true;
        }

        if (Notification.permission === "denied") {
            setButtonState(button, {
                text: "Browser Notifications Blocked — Check Browser Settings",
                disabled: true,
                title: "Browser notification permission is blocked in browser settings.",
                state: "permission-denied"
            });
            window.__KRASKUS_CHTA_NOTIFICATION_UX__ = "PERMISSION_DENIED";
            return true;
        }

        setButtonState(button, {
            text: "Enable Browser Notifications",
            disabled: false,
            title: "",
            state: Notification.permission
        });
        window.__KRASKUS_CHTA_NOTIFICATION_UX__ = Notification.permission.toUpperCase();
        return true;
    }

    function installNotificationObserver() {
        if (!document.body) return;

        applyNotificationUx();
        const observer = new MutationObserver(() => applyNotificationUx());
        observer.observe(document.body, { childList: true, subtree: true });
        window.__KRASKUS_CHTA_NOTIFICATION_OBSERVER_V9__ = observer;

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

    window.__KRASKUS_CHTA_PREPAINT_V9__ = true;
})();
