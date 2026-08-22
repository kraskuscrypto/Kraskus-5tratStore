# Kaspa Solo by Kraskus — Licensing and provenance

## Rusty Kaspa

Upstream project: `kaspanet/rusty-kaspa`

Release used by this recipe: `v2.0.1`

The application downloads the official Linux AMD64 release archive directly from the upstream GitHub release during image build and verifies the published SHA-256 digest before extraction.

Rusty Kaspa is distributed under the license terms contained in the upstream repository. This package does not relicense or claim ownership of Rusty Kaspa, `kaspad`, or the Rusty Kaspa Stratum Bridge.

## Kraskus controller and interface

The Kraskus-specific controller, local persistence layer, setup flow, and web interface in this app recipe are maintained by Kraskus as part of the Kraskus 5tratStore integration.

## Third-party runtime base image

Both custom Dockerfiles use the official Alpine 3.22.1 image pinned to immutable digest:

`sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1`

The controller installs Python 3 from that pinned Alpine distribution at image-build time.

## User secrets

This application does not require or store a Kaspa seed phrase, wallet private key, or signing key. A public Kaspa address may be stored locally as a convenience for generating miner connection strings.
