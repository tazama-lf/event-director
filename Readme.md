## Channel Router Setup Processor

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/frmscoe/channel-router-setup-processor/node.js.yml)

An overview of the processor is detailed [here](https://github.com/frmscoe/docs/blob/main/Product/channel-router-and-setup-processor.md)

## Setting Up

### Dependencies

- [ArangoDB](https://arangodb.com/)
  You need to have an active network map. Refer to the [aforementioned](https://github.com/frmscoe/docs/blob/main/Product/channel-router-and-setup-processor.md) documentation
- [NATS](https://nats.io)
  This is what the processors mainly use for communication
- [Redis](https://redis.io/)
  For caching

You also need NodeJS to be installed in your system. The [latest](https://nodejs.org/en) available version should suffice. Unix platforms, you should be able to find `nodejs` in your package manager's repositories.

### Clone the repository:

```sh
git clone https://github.com/frmscoe/channel-router-setup-processor
```

### Install dependencies

```sh
cd channel-router-setup-processor
npm i
```

### Configure environment

| Variable | Purpose | Example
| ------ | ------ | ------ |
| `FUNCTION_NAME` | Denotes the type of application that is running. This is also used in logs to show the source of logs | `CRSP`
| `NODE_ENV` | Represents the environment the application is currently running in | `dev`
| `REST_PORT` | Port the application is served on [**Deprecated**] |`3000`
| `CACHETTL` | Duration in milliseconds until a cache key is expired |`5000`
| `MAX_CPU` | Max number of CPUs to use | `1`
| `APM_ACTIVE` | Enable Application Performance Monitoring through Elastic | `false`
| `REDIS_DB` | Redis database | `0`
| `REDIS_AUTH` | Redis password | `01ARZ3Example`
| `REDIS_SERVERS` | Redis Host in `json` format | `[{"host":"redis", "port":6379}]`
| `REDIS_IS_CLUSTER` | A flag to indicate if Redis is served in cluster mode | `false`
| `SERVER_URL` | A URL where [NATS] is served | `nats:4222`
| `STARTUP_TYPE` | Configure [NATS] NATS features | `nats`
| `CONSUMER_STREAM` | The [NATS] subject that this application listens on | `CRSP`
| `PRODUCER_STREAM` | The [NATS] subject(s) that this application sends messages to | `Rule901`
| `ACK_POLICY` | [NATS] Ack policy | `Explicit`
| `PRODUCER_STORAGE` | [NATS] Producer Storage | `File`
| `PRODUCER_RETENTION_POLICY` | [NATS] Producer Retention Policy | `Workqueue`
| `DATABASE_URL` | URL where [Arango] is served | `tcp://arango:8529`
| `DATABASE_USER` | [Arango] database username | `root`
| `DATABASE_PASSWORD` | [Arango] database password | `password`
| `DATABASE_NAME` | [Arango] database name | `networkmap`
| `CONFIG_DATABASE` | [Arango] Configuration name | `Configuration`

### Inputs

As the processor listens on a NATS subject, the message it receives is deserialised into an object:

```js

```
