# Kaspa Solo by Kraskus

A self-contained Kaspa solo-mining appliance for 5tratumOS.

## Included services

- **kaspad** — official Rusty Kaspa v2.0.1 mainnet node
- **bridge** — official Rusty Kaspa v2.0.1 Stratum Bridge in external-node mode
- **controller** — Kraskus local API, SQLite event/block persistence, setup and dashboard
- **app_proxy** — 5tratumOS-integrated access to the Kraskus UI

## Security model

- No Docker socket
- No privileged containers
- No host networking
- No added Linux capabilities
- Node RPC is private to the app network
- Bridge dashboard/API is private to the app network
- UI is bound to localhost and intended to be reached through 5tratumOS app_proxy
- Kaspa P2P is published on TCP 16111
- Stratum is published on TCP 5555 for miners on networks that can reach the host
- No wallet seed phrase, private key, or signing key is requested or stored

## Mining identity

ASIC miners connect to:

```text
HOST-LAN-IP:5555
```

Username:

```text
kaspa:YOUR_KASPA_ADDRESS.WORKERNAME
```

Password:

```text
x
```

The mining reward address is supplied by the miner username. The optional wallet field in the Kraskus UI stores only a public address and exists to generate connection instructions.

## Persistence

5tratumOS app data is used for:

```text
${APP_DATA_DIR}/node        Rusty Kaspa blockchain state
${APP_DATA_DIR}/controller  SQLite block/event history and local UI preferences
```

The controller stores discovered blocks in SQLite so bridge restarts do not erase the Kraskus block-history view.

## Runtime provenance

The runtime Dockerfile downloads:

```text
rusty-kaspa-v2.0.1-linux-amd64.zip
```

from the official `kaspanet/rusty-kaspa` GitHub release and verifies:

```text
SHA256 9d0ad0aedbe29670e3e2dde664462c526d30a2d2ff7274d18b1a310a127d1c13
```

before extracting `kaspad` and `stratum-bridge`.

The container base is pinned to the same immutable Alpine 3.22.1 digest already used by the Kraskus reference store.

## Default bridge configuration

- external node: `kaspad:16110`
- Stratum: `:5555`
- minimum share difficulty: `512`
- VarDiff: enabled
- target shares/minute: `30`
- power-of-two clamp: enabled
- bridge API/dashboard: `:3030`, internal only
- coinbase tag suffix: `KraskusSolo`

## Dashboard

The Kraskus interface provides:

- node reachability
- bridge health
- mining-ready state
- network hashrate and difficulty
- network block count
- active workers
- accepted shares
- bridge uptime
- worker table
- persisted block history
- generated ASIC connection settings
- public-address/default-worker configuration
- explicit remote-mining/NAT acknowledgement

## Upstream limitation

The official Rusty Kaspa Stratum Bridge is currently labeled **BETA** by Kaspa. This is disclosed in the app listing and UI.

## Validation

From the store root:

```bash
python3 scripts/validate_store.py
scripts/validate-compose.sh kaspa-solo
```

Runtime smoke test on a Docker-capable 5tratumOS test host:

```bash
export APP_DATA_DIR=/tmp/kaspa-solo-test
mkdir -p "$APP_DATA_DIR"
docker compose -f kaspa-solo/docker-compose.yml build
docker compose -f kaspa-solo/docker-compose.yml up -d
curl -fsS http://127.0.0.1:33070/healthz
curl -fsS http://127.0.0.1:33070/api/state
```

Then verify TCP 5555 from a Kaspa ASIC and allow the node to synchronize before judging mining readiness.

## Production gate

The app remains `status: proposed` until all of the following are completed on a 5tratumOS test installation:

1. clean install
2. official binaries checksum verification during build
3. node synchronization
4. node persistence across restart
5. bridge connection to the local node
6. ASIC subscribe and authorize
7. accepted shares
8. VarDiff behavior
9. worker telemetry
10. block telemetry persistence
11. application restart
12. host reboot
13. update path
14. uninstall behavior
15. soak test

No production-ready claim should be made before that gate is complete.
