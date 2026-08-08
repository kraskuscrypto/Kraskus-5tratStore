# Licenses, provenance, and referral disclosure

## Mysterium Node

- Upstream project: Mysterium Network Node
- Source: https://github.com/mysteriumnetwork/node
- Official container: `mysteriumnetwork/myst`
- Target tag: `1.38.5-alpine`
- License: GPL-3.0
- License evidence: https://github.com/mysteriumnetwork/node/blob/master/LICENSE
- Docker installation docs: https://github.com/mysteriumnetwork/node/blob/master/INSTALL.md

The app recipe does not redistribute the Mysterium source or image. The user's
Docker daemon pulls the official upstream image.

## Portal runtime

The small static onboarding page is served by the official nginx Alpine image.
The image is pinned to an immutable RepoDigest before publication.

## Branding

The listing references the Mysterium emblem from Mysterium's public brand-assets
site rather than embedding a copied asset.

Brand assets:
https://www.mysterium.network/brand-assets

Icon URL:
https://static.wixstatic.com/media/5b19bf_70f93de8752d429f9acaad9ab250a5f8~mv2.png/v1/fill/w_239%2Ch_239%2Cal_c%2Cq_85%2Cusm_0.66_1.00_0.01%2Cenc_avif%2Cquality_auto/logo.png

## Referral disclosure

New users who click **Create MystNodes Account** are sent to:

https://mystnodes.co/?referral_code=CJSoelVnKkllilXIgv7JqeroUv1jhnZ4KWE4G6E4

This is a Kraskus referral URL. Existing users can skip that path. MystNodes
controls referral attribution, eligibility, rewards, account creation, and node
claiming.

The user's MystNodes API key is separate from the referral code and is never
embedded in this repository.
