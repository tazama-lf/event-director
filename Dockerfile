ARG BUILD_IMAGE=oven/bun
ARG RUN_IMAGE=oven/bun

FROM ${BUILD_IMAGE} AS builder
LABEL stage=build
# TS -> JS stage

WORKDIR /home/app
COPY ./src ./src
COPY ./package*.json ./
COPY ./tsconfig.json ./
COPY bunfig.toml ./
ARG GH_TOKEN
RUN sed -i "s/\${GH_TOKEN}/$GH_TOKEN/g" ./bunfig.toml

RUN bun install

# APP
ENV NODE_ENV=production
ENV FUNCTION_NAME=channel-router-setup-processor
ENV PORT=3000
ENV MAX_CPU=1

#APM
ENV APM_ACTIVE=true
ENV APM_URL=http://apm-server.development.svc.cluster.local:8200/
ENV APM_SECRET_TOKEN=

# REDIS
ENV REDIS_DB=0
ENV REDIS_AUTH=
ENV REDIS_SERVERS=
ENV REDIS_IS_CLUSTER=

# NATS
ENV SERVER_URL=0.0.0.0:4222
ENV STARTUP_TYPE=nats
ENV CONSUMER_STREAM=
ENV PRODUCER_STREAM=
ENV ACK_POLICY=Explicit
ENV PRODUCER_STORAGE=File
ENV PRODUCER_RETENTION_POLICY=Workqueue

# ARANGO
ENV DATABASE_URL=
ENV DATABASE_NAME=networkmap
ENV DATABASE_USER=root
ENV DATABASE_PASSWORD=
ENV DATABASE_CERT_PATH=
ENV CONFIG_DATABASE=Configuration
ENV CACHE_TTL=300

# LOGSTASH
ENV LOGSTASH_HOST=logstash.development.svc.cluster.local
ENV LOGSTASH_PORT=8080
ENV LOGSTASH_LEVEL='info'


# Set healthcheck command
HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1

# Execute watchdog command
CMD ["bun", "src/index.ts"]