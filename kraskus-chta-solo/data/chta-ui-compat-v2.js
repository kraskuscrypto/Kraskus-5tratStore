(() => {
    "use strict";

    const COMPAT_HEADER =
        "X-Kraskus-Overview-Compatibility";

    const ROUND_UNAVAILABLE =
        "round-unavailable";

    let lastOverview = null;
    let roundUnavailable = false;
    let applyQueued = false;

    const $ = id =>
        document.getElementById(id);

    function booleanValue(
        value,
        fallback = false
    ) {
        if (typeof value === "boolean") {
            return value;
        }

        if (typeof value === "number") {
            return value !== 0;
        }

        if (typeof value === "string") {
            const normalized =
                value.trim().toLowerCase();

            if (
                [
                    "true",
                    "1",
                    "yes",
                    "ready",
                    "online",
                ].includes(normalized)
            ) {
                return true;
            }

            if (
                [
                    "false",
                    "0",
                    "no",
                    "offline",
                    "waiting",
                ].includes(normalized)
            ) {
                return false;
            }
        }

        return fallback;
    }

    function setText(
        id,
        value
    ) {
        const el = $(id);

        if (!el) {
            return;
        }

        const next = String(value);

        if (el.textContent !== next) {
            el.textContent = next;
        }
    }

    function setStatusPill(
        text,
        className
    ) {
        const el = $("appStatus");

        if (!el) {
            return;
        }

        el.className =
            "zec-status-pill " + className;

        el.textContent = text;
    }

    function setMachineState(
        text,
        good
    ) {
        const el =
            $("machineNetworkState");

        if (!el) {
            return;
        }

        el.textContent = text;

        el.style.color = good
            ? "var(--green)"
            : "var(--gold-hi)";
    }

    function applyLegacyState(data) {
        if (
            !data
            || typeof data !== "object"
        ) {
            return;
        }

        const status =
            data.status || {};

        const readiness =
            data.readiness || {};

        const checks =
            readiness.checks || {};

        const node =
            status.node
            || readiness.node
            || {};

        const state = String(
            readiness.state
            || status.state
            || ""
        ).toUpperCase();

        const readyToMine =
            booleanValue(
                readiness.ready_to_mine,
                false
            );

        const chainSynced =
            booleanValue(
                readiness.chain_synced,
                booleanValue(
                    checks.chain_synced,
                    false
                )
            );

        const payoutConfigured =
            booleanValue(
                readiness.payout_configured,
                booleanValue(
                    checks.payout_configured,
                    false
                )
            );

        const syncPercent =
            Number(node.sync_percent);

        const peers =
            Number(node.peers);

        const network =
            node.network
            || status.network
            || "";

        const workers =
            data.workers || {};

        const blocks =
            data.blocks || {};

        const workerList =
            Array.isArray(workers.workers)
                ? workers.workers
                : [];

        const minerCountRaw =
            workers.count;

        const minerCount =
            Number.isFinite(
                Number(minerCountRaw)
            )
                ? Number(minerCountRaw)
                : workerList.length;

        const shareCountRaw =
            workers.total_shares;

        const shareCount =
            Number.isFinite(
                Number(shareCountRaw)
            )
                ? Number(shareCountRaw)
                : workerList.reduce(
                    (sum, worker) =>
                        sum
                        + Number(
                            worker.accepted_shares
                            ?? worker.shares
                            ?? 0
                        ),
                    0
                );

        const blockList =
            Array.isArray(blocks.blocks)
                ? blocks.blocks
                : [];

        const blockCountRaw =
            blocks.count;

        const blockCount =
            Number.isFinite(
                Number(blockCountRaw)
            )
                ? Number(blockCountRaw)
                : blockList.length;

        /*
         * Synchronization state has priority over payout setup
         * for the global appliance-state indicators. A syncing
         * chain must never render as connected/ready merely
         * because some other prerequisite has a value.
         */
        if (readyToMine) {
            setStatusPill(
                "Ready",
                "zec-status-ready"
            );

            setMachineState(
                "READY",
                true
            );
        } else if (
            state === "SYNCING"
            || !chainSynced
        ) {
            setStatusPill(
                "Syncing",
                "zec-status-syncing"
            );

            setMachineState(
                "SYNCING",
                false
            );
        } else if (
            !payoutConfigured
        ) {
            setStatusPill(
                "Setup Required",
                "zec-status-setup"
            );

            setMachineState(
                "SETUP REQUIRED",
                false
            );
        } else {
            setStatusPill(
                "Waiting",
                "zec-status-syncing"
            );

            setMachineState(
                "WAITING",
                false
            );
        }

        if (
            Number.isFinite(syncPercent)
        ) {
            setText(
                "machineSync",
                syncPercent.toFixed(2)
                    + "%"
            );
        } else {
            setText(
                "machineSync",
                "—"
            );
        }

        setText(
            "machineMiners",
            minerCount
        );

        setText(
            "machineShares",
            shareCount
        );

        setText(
            "machineBlocks",
            blockCount
        );

        if (network) {
            setText(
                "networkStatus",
                network
                + " · "
                + (
                    Number.isFinite(peers)
                    ? peers
                    : 0
                )
                + " peers"
            );
        } else {
            setText(
                "networkStatus",
                "Waiting for node"
            );
        }

        setText(
            "heroChainState",
            chainSynced
                ? "READY"
                : "SYNCING"
        );
    }

    function directText(el) {
        return Array.from(
            el.childNodes
        )
            .filter(
                node =>
                    node.nodeType
                    === Node.TEXT_NODE
            )
            .map(
                node =>
                    node.textContent || ""
            )
            .join("")
            .trim();
    }

    function findExactText(
        root,
        label
    ) {
        const nodes =
            root.querySelectorAll("*");

        for (const node of nodes) {
            if (
                node.textContent.trim()
                === label
            ) {
                return node;
            }

            if (
                directText(node)
                === label
            ) {
                return node;
            }
        }

        return null;
    }

    function blankSiblingValue(
        root,
        label
    ) {
        const labelEl =
            findExactText(
                root,
                label
            );

        if (!labelEl) {
            return;
        }

        const valueEl =
            labelEl.nextElementSibling;

        if (!valueEl) {
            return;
        }

        const current =
            valueEl.textContent.trim();

        if (
            current === "0"
            || current === "0s"
            || current === "0.00%"
        ) {
            valueEl.textContent = "—";
        }
    }

    function applyRoundUnavailable() {
        if (!roundUnavailable) {
            return;
        }

        const surface =
            $("krOverviewV3");

        if (!surface) {
            return;
        }

        /*
         * These values are absent, not zero, while
         * round_telemetry_unavailable is authoritative.
         */
        for (const label of [
            "ROUND BEST",
            "BLOCK THRESHOLD",
            "ROUND SHARES",
            "ROUND AGE",
        ]) {
            blankSiblingValue(
                surface,
                label
            );
        }
    }

    function suppressLegacyConnectPanel() {
        const panels =
            document.querySelectorAll(
                ".kr-connect-v2-host"
            );

        for (const panel of panels) {
            panel.hidden = true;

            panel.setAttribute(
                "aria-hidden",
                "true"
            );

            panel.style.setProperty(
                "display",
                "none",
                "important"
            );
        }
    }

    function apply() {
        applyQueued = false;

        suppressLegacyConnectPanel();

        if (lastOverview) {
            applyLegacyState(
                lastOverview
            );
        }

        applyRoundUnavailable();
    }

    function queueApply() {
        if (applyQueued) {
            return;
        }

        applyQueued = true;

        window.requestAnimationFrame(
            apply
        );
    }

    const originalFetch =
        window.fetch.bind(window);

    window.fetch =
        async function (...args) {
            const response =
                await originalFetch(
                    ...args
                );

            try {
                const input = args[0];

                const rawUrl =
                    typeof input === "string"
                        ? input
                        : input?.url;

                const url =
                    new URL(
                        rawUrl,
                        window.location.href
                    );

                if (
                    url.pathname.endsWith(
                        "/api/overview"
                    )
                ) {
                    const cloned =
                        response.clone();

                    const data =
                        await cloned.json();

                    lastOverview = data;

                    roundUnavailable =
                        response.headers.get(
                            COMPAT_HEADER
                        )
                        === ROUND_UNAVAILABLE;

                    queueApply();
                }
            } catch (error) {
                console.debug(
                    "CHTA compatibility overlay:",
                    error
                );
            }

            return response;
        };

    /*
     * The V2 renderer rebuilds only #krOverviewV3 after
     * each overview poll. Observe that surface alone.
     *
     * Do not observe the whole document: this overlay also
     * updates legacy header/hero elements, and observing
     * those own writes could create a self-triggering render
     * loop.
     *
     * The observer re-applies only the presentation rule for
     * unavailable round telemetry. Authoritative legacy state
     * remains driven by intercepted /api/overview responses.
     */
    function installRoundObserver() {
        const surface =
            $("krOverviewV3");

        if (!surface) {
            return;
        }

        const observer =
            new MutationObserver(
                () => {
                    window.requestAnimationFrame(
                        applyRoundUnavailable
                    );
                }
            );

        observer.observe(
            surface,
            {
                childList: true,
                subtree: true,
            }
        );
    }

    function installCompatDomOwnership() {
        suppressLegacyConnectPanel();
        installRoundObserver();

        /*
         * Frozen V2 installs the legacy connection transform
         * during DOMContentLoaded as well. One deferred pass
         * ensures our Store compatibility layer runs after
         * those synchronous startup handlers complete.
         */
        window.setTimeout(
            suppressLegacyConnectPanel,
            0
        );
    }

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            installCompatDomOwnership,
            {
                once: true,
            }
        );
    } else {
        installCompatDomOwnership();
    }

    /*
     * Capture current truth once because this overlay may
     * load after the very first V2 fetch. Subsequent V2
     * requests are intercepted above and do not add traffic.
     */
    originalFetch(
        "/api/overview",
        {
            cache: "no-store",
        }
    )
        .then(async response => {
            const data =
                await response.clone()
                    .json();

            lastOverview = data;

            roundUnavailable =
                response.headers.get(
                    COMPAT_HEADER
                )
                === ROUND_UNAVAILABLE;

            queueApply();
        })
        .catch(() => {});

    window.__KRASKUS_CHTA_COMPAT_V1__ =
        true;
})();
