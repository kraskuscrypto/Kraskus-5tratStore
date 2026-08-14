#!/bin/sh
set -eu
exec stratum-bridge --config /opt/kraskus/bridge.yaml --node-mode external
