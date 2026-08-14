FROM debian:bookworm-slim AS fetcher
ARG KASPA_VERSION=v2.0.1
ARG KASPA_ARCHIVE=rusty-kaspa-v2.0.1-linux-amd64.zip
ARG KASPA_SHA256=9d0ad0aedbe29670e3e2dde664462c526d30a2d2ff7274d18b1a310a127d1c13
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && rm -rf /var/lib/apt/lists/*
WORKDIR /tmp/kaspa
RUN curl -fsSLO "https://github.com/kaspanet/rusty-kaspa/releases/download/${KASPA_VERSION}/${KASPA_ARCHIVE}" \
 && echo "${KASPA_SHA256}  ${KASPA_ARCHIVE}" | sha256sum -c - \
 && unzip "${KASPA_ARCHIVE}" \
 && test -x ./bin/kaspad \
 && test -x ./bin/stratum-bridge

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --create-home kaspa
COPY --from=fetcher /tmp/kaspa/bin/kaspad /usr/local/bin/kaspad
COPY --from=fetcher /tmp/kaspa/bin/stratum-bridge /usr/local/bin/stratum-bridge
COPY bridge.yaml /opt/kraskus/bridge.yaml
COPY run-node.sh /opt/kraskus/run-node.sh
COPY run-bridge.sh /opt/kraskus/run-bridge.sh
RUN chmod 0555 /usr/local/bin/kaspad /usr/local/bin/stratum-bridge /opt/kraskus/run-node.sh /opt/kraskus/run-bridge.sh \
 && mkdir -p /data && chown -R kaspa:kaspa /data
USER kaspa
