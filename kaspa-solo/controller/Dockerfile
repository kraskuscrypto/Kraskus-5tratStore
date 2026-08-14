FROM python:3.13-alpine
WORKDIR /app
COPY server.py /app/server.py
COPY static /app/static
RUN addgroup -S kraskus && adduser -S -G kraskus -u 10001 kraskus \
 && mkdir -p /data && chown -R kraskus:kraskus /data /app
USER kraskus
EXPOSE 8080
CMD ["python", "/app/server.py"]
