# MystNodes by Kraskus runtime architecture

## Persistent state
- `${APP_DATA_DIR}/data/mysterium/` — Mysterium identity and runtime state.
- `${APP_DATA_DIR}/data/nodeui-proxy/` — persistent Node UI proxy defaults when used.

Portal HTML/CSS/JS/images, nginx configuration, the status agent, and release
metadata are versioned application files and are replaced during updates.

## Services
- `mysterium` — pinned official upstream Mysterium node.
- `nodeui-proxy` — pinned nginx helper for the local upstream Node UI.
- `portal` — Kraskus 5tratumOS shell and Overview.
- `status-agent` — pinned Alpine helper serving read-only local metrics at
  `127.0.0.1:33061/status.json`.

The status agent does not use the Docker socket. It reads host `/proc`,
`/sys/class/net`, and `/` read-only for CPU, memory, disk, uptime, network
bandwidth, and identity-presence information.

## Data safety
Updates must preserve `${APP_DATA_DIR}/data/mysterium`.
