#!/bin/sh
set -eu
exec kaspad \
  --yes \
  --disable-upnp \
  --utxoindex \
  --appdir=/data \
  --rpclisten=0.0.0.0:16110
