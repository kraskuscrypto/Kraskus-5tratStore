# Kraskus CHTA Solo — Components and Distribution Notices

Kraskus CHTA Solo is a Kraskus Crypto application packaged for
5tratumOS.

## Kraskus CHTA application

The initialization runtime, Backend V2 application, Store recipe,
listing text, and Divinity CHTA artwork are maintained by
Kraskus Crypto.

Qualified Store release images:

- `ghcr.io/kraskuscrypto/kraskus-chta-solo@sha256:ecd132f97d5c7957dabc80e18eaa4517d87ee9f033d7b01b5d401e74dc515528`
  — qualified first-run initialization image.

- `ghcr.io/kraskuscrypto/kraskus-chta-solo@sha256:36affa9593c3fab2d6f29f255eaffc69233f96fcd50cbe21ace1900ed45eb24b`
  — qualified Backend V2 application image.

## CheetahCoin Core

CheetahCoin Core is upstream software distributed under the MIT
license.

Upstream project:

- https://github.com/ShorelineCrypto/cheetahcoin

The Store recipe uses the exact qualified Core image:

- `ghcr.io/kraskuscrypto/kraskus-cheetahcoin-core@sha256:072f124dcbcff225733a0248f14689edafd1bedd402798f2d677dd4515fcd321`

The qualified image has Docker image ID:

- `sha256:183904066a2a9e45c44ffa07cc24f4b900fd4c70b150746d64c72bdcb562492b`

The upstream copyright and MIT license terms remain applicable.

## CKPool

CKPool is free software distributed under GNU GPL version 3.

The qualified appliance uses the existing WillItMod CKPool container
directly by immutable registry digest:

- `ghcr.io/willitmod/docker-ckpool-solo@sha256:8a9a7f10c8138d0f55533132ee7710a06715a42a49f75efb39be3350ada4fa6e`

That registry artifact has Docker image ID:

- `sha256:2d671d11bcb81e9f253d4ffb5fe95737939609cdd66771b7d12ef9fe4ba266f0`

Qualification proved this is the exact CKPool image object and binary
used during clean-room testing. The included `ckpool` binary reports
version `ckpool/0.9.9`.

The Store recipe does not mirror or republish the WillItMod CKPool
artifact. It references the original immutable registry artifact.

CKPool's GPLv3 terms remain applicable.

## User data

This Store recipe contains no:

- RPC usernames or passwords;
- wallet data;
- blockchain data;
- configured payout address;
- Docker socket access;
- host credentials.

RPC credentials are generated locally during first-run
initialization and remain in persistent application storage.
