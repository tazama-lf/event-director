FROM node:16 AS builder
LABEL stage=build

# Create a folder named function
RUN mkdir -p /home/app

# Wrapper/boot-strapper
WORKDIR /home/app

COPY ./src ./src
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./tsconfig.json ./
COPY ./.npmrc ./
ENV GH_TOKEN=

# Install dependencies for production
RUN npm ci --omit=dev --ignore-scripts

# Build the project
RUN npm run build

FROM gcr.io/distroless/nodejs16-debian11:nonroot
USER nonroot

COPY --from=builder /home/app /home/app

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

WORKDIR /home/app

# Environment variables for openfaas
ENV cgi_headers="true"
#ENV fprocess="node ./build/index.js"
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

# Set healthcheck command
HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1

# Execute watchdog command
CMD ["build/index.js"]
