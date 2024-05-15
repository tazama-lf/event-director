# Channel Routing \& Setup Processor (CRSP)

<div align="center">
<img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/frmscoe/channel-router-setup-processor/node.js.yml">
</div>

## Overview
An overview of the processor is detailed [here](https://github.com/frmscoe/docs/blob/main/Product/channel-router-and-setup-processor.md)

  - [Sequence Diagram](#sequence-diagram)
  - [Code Activity Diagram](#code-activity-diagram)
  - [Usage](#usage)
  - [Sample JSON Request \& Response](#sample-json-request--response)
    - [Request for Pain001](#request-for-pain001)
    - [Response for Pain001](#response-for-pain001)
    - [Request for Pain013](#request-for-pain013)
    - [Response for Pain013](#response-for-pain013)
    - [Request for Pacs002](#request-for-pacs002)
    - [Response for Pacs002](#response-for-pacs002)
    - [Request for Pacs008](#request-for-pacs008)
    - [Response for Pacs008](#response-for-pacs008)
  - [Troubleshooting](#troubleshooting)

### Setting Up

#### Dependencies

- [ArangoDB](https://arangodb.com/)
  You need to have an active network map. Refer to the [aforementioned](https://github.com/frmscoe/docs/blob/main/Product/channel-router-and-setup-processor.md) documentation
- [NATS](https://nats.io)
  This is what the processors mainly use for communication
- [Redis](https://redis.io/)
  For caching

You also need NodeJS to be installed in your system. The current LTS (https://nodejs.org/en) should be suitable. Please open an issue if the application fails to build on the current LTS version. Unix platforms, you should be able to find `nodejs` in your package manager's repositories.

#### Clone the repository:

```sh
git clone https://github.com/frmscoe/channel-router-setup-processor
```

#### Install dependencies

```sh
cd channel-router-setup-processor
npm i
```

## Inputs

A Pacs002 message is expected as an input:

```json
{
  "transaction": {
    "TxTp": "pacs.002.001.12",
    "FIToFIPmtSts": {
      "GrpHdr": {
        "MsgId": "43c0e3bd11164fef87a427ec559a9e92",
        "CreDtTm": "2020-05-08T12:38:28.812Z"
      },
      "TxInfAndSts": {
        "OrgnlInstrId": "5ab4fc7355de4ef8a75b78b00a681ed2",
        "OrgnlEndToEndId": "3bc4ea02daea4b7fb354d44211561150",
        "TxSts": "ACCC",
        "ChrgsInf": [
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp001"
                }
              }
            }
          },
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp001"
                }
              }
            }
          },
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp002"
                }
              }
            }
          }
        ],
        "AccptncDtTm": "2023-06-02T07:52:31.000Z",
        "InstgAgt": {
          "FinInstnId": {
            "ClrSysMmbId": {
              "MmbId": "dfsp001"
            }
          }
        },
        "InstdAgt": {
          "FinInstnId": {
            "ClrSysMmbId": {
              "MmbId": "dfsp002"
            }
          }
        }
      }
    }
  },
  "DataCache": {
    "dbtrId": "dbtrId",
    "cdtrId": "cdtrId",
    "cdtrAcctId": "cdtrAcct_abc",
    "dbtrAcctId": "dbtrAcct_def",
    "amt": {
      "amt": 422.25,
      "ccy": "XTS"
    },
    "creDtTm": "2020-05-08T12:33:28.812Z"
  }
}
```

## Internal Process Flow

```mermaid
flowchart TD
    start([Start]) --> postRequest[Accept NATS message from TMS]
    postRequest --> note1["Data expected: Pacs002 with DataCache"]
    note1 --> readCache[Read active network map from Redis Cache]
    readCache --> note2["Required Parameter: Cache key"]
    note2 --> checkMemory{Active Network map is found in memory}
    checkMemory -->|Yes| pruneMap[prune network map]
    checkMemory -->|No| readDB[Read active network map from Database]
    readDB --> checkDB{Network map is found}
    checkDB -->|Yes| saveCache[Save Active network map to cache]
    saveCache --> note3["Required Parameter: Cache key, Active Network Map in JSON format, Expiry time based on environment"]
    note3 --> pruneMap
    checkDB -->|No| logResult[Return No network map found in DB and Log the result]
    logResult --> note4["Results: rulesSentTo empty, failedToSend empty, networkMap empty, transaction req"]
    note4 --> stop1([Stop])
    pruneMap --> deduplicate[deduplicate all rules]
    deduplicate --> ruleLoop{foreach rule in the network sub-map}
    ruleLoop -->|More rules| sendData[Send Data]
    sendData --> note5["Data sent: transaction, network sub-map"]
    sendData --> ruleLoop
    ruleLoop -->|No more rules| sendResponse[send response back to Data Preparation]
    sendResponse --> note6["Response includes: Rules sent to, Rules not sent to, Transaction, Network sub-map"]
    note6 --> stop2([Stop])
```

![crsp-activity-diagram](images/CRSP-Activity-Diagram.png)
![crsp-diagram](images/CRSP.png)

### Sequence Diagram

![crsp-sequence-diagram](images/CRSP-Sequence-Diagram.png)

The channel-router-setup-processor (CRSP) is where most of the heavy lifting happens. The CRSP is responsible for branching the transaction to all the different rules in the different typologies. It uses the Network Map as configuration source, de-duplicates all the rules, generates a network submap (that is sent to Rule Processors), allowing the Rule Processors to know to which Typologies they need to send their results.

## Outputs

```json
{
  "transaction": {
    "TxTp": "pacs.002.001.12",
    "FIToFIPmtSts": {
      "GrpHdr": {
        "MsgId": "5a22641e90ca47fab8a3f23663a64e56",
        "CreDtTm": "2024-05-08T12:34:17.889Z"
      },
      "TxInfAndSts": {
        "OrgnlInstrId": "5ab4fc7355de4ef8a75b78b00a681ed2",
        "OrgnlEndToEndId": "d8e1734cee4f4ccaabf0d22d0d91dbda",
        "TxSts": "ACCC",
        "ChrgsInf": [
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp001"
                }
              }
            }
          },
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp001"
                }
              }
            }
          },
          {
            "Amt": {
              "Amt": 0,
              "Ccy": "USD"
            },
            "Agt": {
              "FinInstnId": {
                "ClrSysMmbId": {
                  "MmbId": "dfsp002"
                }
              }
            }
          }
        ],
        "AccptncDtTm": "2023-06-02T07:52:31.000Z",
        "InstgAgt": {
          "FinInstnId": {
            "ClrSysMmbId": {
              "MmbId": "dfsp001"
            }
          }
        },
        "InstdAgt": {
          "FinInstnId": {
            "ClrSysMmbId": {
              "MmbId": "dfsp002"
            }
          }
        }
      }
    }
  },
  "networkMap": {
    "active": true,
    "cfg": "1.0.0",
    "messages": [
      {
        "id": "004@1.0.0",
        "cfg": "1.0.0",
        "txTp": "pacs.002.001.12",
        "typologies": [
          {
            "id": "typology-processor@1.0.0",
            "cfg": "999@1.0.0",
            "rules": [
              {
                "id": "901@1.0.0",
                "cfg": "1.0.0"
              }
            ]
          }
        ]
      }
    ]
  },
  "DataCache": {
    "dbtrId": "dbtrId",
    "cdtrId": "cdtrId",
    "cdtrAcctId": "cdtrAcct_abc",
    "dbtrAcctId": "dbtrAcct_def",
    "amt": {
      "amt": 615.44,
      "ccy": "XTS"
    },
    "creDtTm": "2020-05-08T12:29:17.889Z"
  },
  "metaData": {
    "prcgTmCRSP": 1,
    "traceParent": null
  }
}
```

## Configure environment

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

## Sequence Diagram




## Sample JSON Request & Response

``POST request to `/execute endpoint``
As the processor listens on a NATS subject, the message it receives is deserialised into an object matching the following structures



## Troubleshooting
#### npm install
Ensure generated token has read package rights

#### npm build
Ensure that you're on the current LTS version of Node.JS

### Runtime issues
#### Network Map changes are not reflected on the application
For changes in the network map, you will have to restart the application
