FROM --platform=${TARGETPLATFORM:-linux/amd64} ghcr.io/openfaas/of-watchdog:0.8.4 as watchdog
FROM --platform=${TARGETPLATFORM:-linux/amd64} node:14-alpine as ship

ARG TARGETPLATFORM
ARG BUILDPLATFORM

COPY --from=watchdog /fwatchdog /usr/bin/fwatchdog
RUN chmod +x /usr/bin/fwatchdog

RUN addgroup -S app && adduser -S -g app app

RUN apk --no-cache add curl ca-certificates

RUN apk add --no-cache -t build-dependencies git make gcc g++ python libtool autoconf automake yarn

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

# Create a folder named function
RUN mkdir -p /home/app

# Wrapper/boot-strapper
WORKDIR /home/app

COPY ./package.json ./
COPY ./yarn.lock ./
COPY ./tsconfig.json ./
COPY ./global.d.ts ./

# Install dependencies
# RUN yarn run cleanup

# Install dependencies
RUN yarn install

COPY ./src ./src

# Build the project
RUN yarn run build

# Environment variables for openfaas
ENV cgi_headers="true"
ENV fprocess="node ./build/index.js"
ENV mode="http"
ENV upstream_url="http://127.0.0.1:3000"

ENV exec_timeout="10s"
ENV write_timeout="15s"
ENV read_timeout="15s"

ENV REST_PORT=3000
ENV GRPC_PORT=50051
ENV FUNCTION_NAME=channel-router-setup-processor

ENV APM_LOGGING=true
ENV APM_SERVICE_NAME=channel-router-setup-processor
ENV APM_URL=http://apm-server-apm-server.frm:8200
ENV APM_SECRET_TOKEN=
ENV NODE_ENV=prod

ENV LOGSTASH_HOST=my-release-logstash.frm-meshed
ENV LOGSTASH_PORT=8080

ENV DB_URL=http://arangodb.frm:8529
ENV DB_NAME=networkmap
ENV DB_USER=root
ENV DB_PASSWORD=123456
ENV RULE_ENDPOINT=http://gateway.frm:8080/function/

ENV prefix_logs="false"

HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1

# Execute watchdog command
CMD ["fwatchdog"]
