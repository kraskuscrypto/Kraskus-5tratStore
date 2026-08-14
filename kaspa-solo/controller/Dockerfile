FROM alpine:3.22.1@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1
RUN apk add --no-cache python3 ca-certificates
WORKDIR /app
COPY server.py /app/server.py
COPY static /app/static
RUN mkdir -p /data
EXPOSE 8080
CMD ["python3", "/app/server.py"]
