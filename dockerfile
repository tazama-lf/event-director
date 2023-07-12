# Stage 1: Build stage
FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.9.12 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:18.16-alpine as build

ARG TARGETPLATFORM
ARG BUILDPLATFORM

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

# Create new group and user called app
RUN addgroup -S app && adduser -S -g app app

# Upgrade all packages and install curl and ca-certificates
RUN apk --no-cache update && \
    apk --no-cache upgrade && \
    apk --no-cache add curl ca-certificates

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

# Create a folder named function
RUN mkdir -p /home/app

# Set working directory / Wrapper/boot-strapper
WORKDIR /home/app

# Copy dependencies manifests
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./tsconfig.json ./
COPY ./global.d.ts ./

# Install dependencies
RUN npm install

# Copy application source code
COPY ./src ./src

# Build the project
RUN npm run build

# Environment variables for openfaas
ENV cgi_headers="true"
ENV fprocess="node ./build/index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"
ENV exec_timeout="90s"
ENV write_timeout="15s"
ENV read_timeout="15s"
ENV prefix_logs="false"
ENV FUNCTION_NAME=channel-router-setup-processor
ENV NODE_ENV="production"
ENV REST_PORT=3000
ENV LOGSTASH_URL=logstash.development:8080
ENV APM_LOGGING=true
ENV APM_URL=http://apm-server.development:8200
ENV APM_SECRET_TOKEN=
ENV LOGSTASH_HOST=logstash.development
ENV LOGSTASH_PORT=8080
ENV DB_URL=
ENV DB_NAME=networkmap
ENV DB_USER=root
ENV DB_PASSWORD=''
ENV DATABASE_CERT_PATH=''
ENV REDIS_DB=0
ENV REDIS_AUTH=
ENV REDIS_HOST=
ENV REDIS_PORT=6379
ENV REDIS_TIMEOUT=0
ENV CONFIG_DATABASE=Configuration
ENV CONFIG_COLLECTION=configuration

ENV STARTUP_TYPE=nats
ENV SERVER_URL=0.0.0.0:4222
ENV PRODUCER_STREAM=
ENV CONSUMER_STREAM=
ENV STREAM_SUBJECT=
ENV ACK_POLICY=Explicit
ENV PRODUCER_STORAGE=File
ENV PRODUCER_RETENTION_POLICY=Workqueue

# Set healthcheck command
HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1

# Execute watchdog command
CMD ["fwatchdog"]
