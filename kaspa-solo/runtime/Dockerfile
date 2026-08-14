FROM alpine:3.22.1@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1 AS fetcher
ARG KASPA_VERSION=v2.0.1
ARG KASPA_ARCHIVE=rusty-kaspa-v2.0.1-linux-amd64.zip
ARG KASPA_SHA256=9d0ad0aedbe29670e3e2dde664462c526d30a2d2ff7274d18b1a310a127d1c13
RUN apk add --no-cache ca-certificates curl unzip
WORKDIR /tmp/kaspa
RUN curl -fsSLO "https://github.com/kaspanet/rusty-kaspa/releases/download/${KASPA_VERSION}/${KASPA_ARCHIVE}" \
 && echo "${KASPA_SHA256}  ${KASPA_ARCHIVE}" | sha256sum -c - \
 && unzip "${KASPA_ARCHIVE}" \
 && test -x ./bin/kaspad \
 && test -x ./bin/stratum-bridge

FROM alpine:3.22.1@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1
RUN apk add --no-cache ca-certificates
COPY --from=fetcher /tmp/kaspa/bin/kaspad /usr/local/bin/kaspad
COPY --from=fetcher /tmp/kaspa/bin/stratum-bridge /usr/local/bin/stratum-bridge
COPY bridge.yaml /opt/kraskus/bridge.yaml
COPY run-node.sh /opt/kraskus/run-node.sh
COPY run-bridge.sh /opt/kraskus/run-bridge.sh
RUN chmod 0555 /usr/local/bin/kaspad /usr/local/bin/stratum-bridge /opt/kraskus/run-node.sh /opt/kraskus/run-bridge.sh \
 && mkdir -p /data
