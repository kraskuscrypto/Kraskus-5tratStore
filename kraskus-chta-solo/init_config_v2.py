#!/usr/bin/env python3

import json
import os
import secrets
from pathlib import Path

CONFIG = Path("/kraskus-config")
SECRETS = Path("/run/secrets")
POOL = Path("/ckpool-data")
NODE = Path("/node-data")

UID = 1000
GID = 1000


def atomic_write(path: Path, text: str, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.chmod(tmp, mode)
    os.replace(tmp, path)


def ensure_secret(path: Path, value_factory) -> str:
    if path.is_file() and path.stat().st_size:
        return path.read_text(encoding="utf-8").strip()

    value = value_factory()
    atomic_write(path, value + "\n", 0o400)
    return value


def chown_if_possible(path: Path) -> None:
    try:
        os.chown(path, UID, GID)
    except OSError:
        pass


def main() -> None:
    CONFIG.mkdir(parents=True, exist_ok=True)
    SECRETS.mkdir(parents=True, exist_ok=True)
    POOL.mkdir(parents=True, exist_ok=True)
    NODE.mkdir(parents=True, exist_ok=True)
    (POOL / "users").mkdir(parents=True, exist_ok=True)

    os.chmod(CONFIG, 0o770)
    os.chmod(SECRETS, 0o700)
    os.chmod(POOL, 0o775)
    os.chmod(NODE, 0o750)
    os.chmod(POOL / "users", 0o775)

    rpc_user_file = SECRETS / "rpc-user"
    rpc_pass_file = SECRETS / "rpc-password"

    rpc_user = ensure_secret(
        rpc_user_file,
        lambda: "kraskus-" + secrets.token_hex(8),
    )

    rpc_password = ensure_secret(
        rpc_pass_file,
        lambda: secrets.token_urlsafe(48),
    )

    core = CONFIG / "cheetahcoin.conf"

    if not core.exists():
        atomic_write(
            core,
            (
                "server=1\n"
                "daemon=0\n"
                "listen=1\n"
                "port=8537\n"
                f"rpcuser={rpc_user}\n"
                f"rpcpassword={rpc_password}\n"
                "rpcport=8536\n"
                "rpcbind=0.0.0.0\n"
                "rpcallowip=127.0.0.1\n"
                "rpcallowip=172.16.0.0/12\n"
                "disablewallet=0\n"
                "discover=1\n"
                "dnsseed=1\n"
                "upnp=0\n"
                "printtoconsole=1\n"
                "logtimestamps=1\n"
                "maxconnections=64\n"
                "dbcache=512\n"
            ),
            0o600,
        )

    settings = CONFIG / "settings.json"

    if not settings.exists():
        atomic_write(
            settings,
            json.dumps(
                {
                    "network": "main",
                    "payout_address": "",
                },
                indent=2,
            ) + "\n",
            0o644,
        )

    ckpool = CONFIG / "ckpool.conf"

    if not ckpool.exists():
        atomic_write(
            ckpool,
            json.dumps(
                {
                    "btcaddress": "",
                    "btcd": [
                        {
                            "auth": rpc_user,
                            "notify": True,
                            "pass": rpc_password,
                            "url": "cheetahcoin:8536",
                        }
                    ],
                    "btcsig": "/Kraskus CHTA Solo/",
                    "blockpoll": 50,
                    "update_interval": 15,
                    "serverurl": ["0.0.0.0:3333"],
                    "logdir": "/www",
                    "userdir": "/www/users",
                    "webdir": "/www/pool",
                    "mindiff": 1024,
                    "startdiff": 4096,
                    "maxdiff": 0,
                    "mindiff_overrides": {
                        "bitaxe": 1024,
                        "nicehash": 500000,
                        "MiningRigRentals": 1000000,
                    },
                    "validated": True,
                },
                indent=2,
            ) + "\n",
            0o640,
        )

    for path in (
        CONFIG,
        SECRETS,
        POOL,
        NODE,
        POOL / "users",
        rpc_user_file,
        rpc_pass_file,
        core,
        settings,
        ckpool,
    ):
        chown_if_possible(path)

    print("CHTA_V2_FIRST_RUN_INITIALIZATION=PASS")


if __name__ == "__main__":
    main()
