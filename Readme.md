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
| `CACHETTL` | Duration in milliseconds until a cache key is expired |`5000`
| `MAX_CPU` | Max number of CPUs to use | `1`
| `APM_ACTIVE` | Enable Application Performance Monitoring through Elastic | `false`
| `REDIS_DB` | Redis database | `0`
| `REDIS_AUTH` | [Redis] password | `01ARZ3Example`
| `REDIS_SERVERS` | [Redis] Host in `json` format | `[{"host":"redis", "port":6379}]`
| `REDIS_IS_CLUSTER` | A flag to indicate if [Redis] is served in cluster mode | `false`
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

### Requests

#### Pacs002

As the processor listens on a NATS subject, the message it receives is deserialised into an object matching the following structure

```json
{
  transaction: {
    TxTp: "pacs.002.001.12",
    FIToFIPmtSts: {
      GrpHdr: {
        MsgId: "43c0e3bd11164fef87a427ec559a9e92",
        CreDtTm: "2020-05-08T12:38:28.812Z",
      },
      TxInfAndSts: {
        OrgnlInstrId: "5ab4fc7355de4ef8a75b78b00a681ed2",
        OrgnlEndToEndId: "3bc4ea02daea4b7fb354d44211561150",
        TxSts: "ACCC",
        ChrgsInf: [
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp001",
                },
              },
            },
          },
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp001",
                },
              },
            },
          },
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp002",
                },
              },
            },
          },
        ],
        AccptncDtTm: "2023-06-02T07:52:31.000Z",
        InstgAgt: {
          FinInstnId: {
            ClrSysMmbId: {
              MmbId: "dfsp001",
            },
          },
        },
        InstdAgt: {
          FinInstnId: {
            ClrSysMmbId: {
              MmbId: "dfsp002",
            },
          },
        },
      },
    },
  },
  DataCache: {
    dbtrId: "dbtrId",
    cdtrId: "cdtrId",
    cdtrAcctId: "cdtrAcct_abc",
    dbtrAcctId: "dbtrAcct_def",
    amt: {
      amt: 422.25,
      ccy: "XTS",
    },
    creDtTm: "2020-05-08T12:33:28.812Z",
  },
}
```

### Response
#### Pacs002

```json
{
  transaction: {
    TxTp: "pacs.002.001.12",
    FIToFIPmtSts: {
      GrpHdr: {
        MsgId: "5a22641e90ca47fab8a3f23663a64e56",
        CreDtTm: "2024-05-08T12:34:17.889Z",
      },
      TxInfAndSts: {
        OrgnlInstrId: "5ab4fc7355de4ef8a75b78b00a681ed2",
        OrgnlEndToEndId: "d8e1734cee4f4ccaabf0d22d0d91dbda",
        TxSts: "ACCC",
        ChrgsInf: [
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp001",
                },
              },
            },
          },
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp001",
                },
              },
            },
          },
          {
            Amt: {
              Amt: 0,
              Ccy: "USD",
            },
            Agt: {
              FinInstnId: {
                ClrSysMmbId: {
                  MmbId: "dfsp002",
                },
              },
            },
          },
        ],
        AccptncDtTm: "2023-06-02T07:52:31.000Z",
        InstgAgt: {
          FinInstnId: {
            ClrSysMmbId: {
              MmbId: "dfsp001",
            },
          },
        },
        InstdAgt: {
          FinInstnId: {
            ClrSysMmbId: {
              MmbId: "dfsp002",
            },
          },
        },
      },
    },
  },
  networkMap: {
    active: true,
    cfg: "1.0.0",
    messages: [
      {
        id: "004@1.0.0",
        cfg: "1.0.0",
        txTp: "pacs.002.001.12",
        typologies: [
          {
            id: "typology-processor@1.0.0",
            cfg: "999@1.0.0",
            rules: [
              {
                id: "901@1.0.0",
                cfg: "1.0.0",
              },
            ],
          },
        ],
      },
    ],
  },
  DataCache: {
    dbtrId: "dbtrId",
    cdtrId: "cdtrId",
    cdtrAcctId: "cdtrAcct_abc",
    dbtrAcctId: "dbtrAcct_def",
    amt: {
      amt: 615.44,
      ccy: "XTS",
    },
    creDtTm: "2020-05-08T12:29:17.889Z",
  },
  metaData: {
    prcgTmCRSP: 1,
    traceParent: null,
  },
}
```
