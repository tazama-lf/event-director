# CRSP

## Overview

Here's a brief explanation of each participant:

1. Caller: The caller initiates the request to process a transaction.
2. Handle Transaction: This function handles the transaction, coordinates the processing steps, and accumulates the results.
3. Logger Service: This service logs various events, errors, and information during the process.
4. Network Map: A map of the transaction network, containing information about messages, channels, typologies, and rules.
5. Rule: A specific rule from the network map that needs to be applied to the transaction.
6. Database Service: This service is responsible for fetching the network map from the database.
7. Cache Client: This Redis cache client stores and retrieves the active network map for faster processing.
8. Rule Processor: This processor applies the rule to the transaction and returns the result.

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Caller as Caller
    participant HandleTransaction as Handle Transaction
    participant LoggerService as Logger Service
    participant NetworkMap as Network Map
    participant Rule as Rule
    participant DatabaseService as Database Service
    participant CacheClient as Cache Client
    participant RuleProcessor as Rule Processor

    Note over Caller, HandleTransaction: The process starts by handling a transaction.

    Caller->>HandleTransaction: handleTransaction(req)
    HandleTransaction->>CacheClient: getJson(cacheKey)

    Note over HandleTransaction, CacheClient: Check if the active network map is in cache.

    alt activeNetworkMap is in cache
        CacheClient-->>HandleTransaction: activeNetworkMap
    else activeNetworkMap is not in cache
        CacheClient-->>HandleTransaction: null
        HandleTransaction->>DatabaseService: getNetworkMap()
        DatabaseService-->>HandleTransaction: networkConfigurationList

        Note over HandleTransaction, DatabaseService: Fetch the network map from the database.

        HandleTransaction->>CacheClient: setJson(cacheKey, JSON.stringify(networkMap), 'EX', config.redis.timeout)

        Note over HandleTransaction, CacheClient: Save the network map in Redis cache.
    end

    HandleTransaction->>HandleTransaction: getRuleMap(networkMap, req.TxTp)

    Note over HandleTransaction: Deduplicate all rules.

    loop rules
        HandleTransaction->>RuleProcessor: sendRuleToRuleProcessor(rule, networkSubMap, req, sentTo, failedRules)

        Note over HandleTransaction, RuleProcessor: Send the transaction to all rules.

        opt ruleRes.status === 200
            RuleProcessor-->>HandleTransaction: Successfully sent to rule.id

            Note over RuleProcessor: Rule is successfully processed.
        end
        opt ruleRes.status !== 200
            RuleProcessor-->>HandleTransaction: Failed to send to rule.id

            Note over RuleProcessor: Rule processing failed.
        end
    end

    HandleTransaction->>Caller: return result

    Note over Caller: The final result is returned to the caller.
```

Here's a detailed explanation of the numbers in the sequence diagram:

1. The process starts with the caller initiating a request to handle a transaction.
2. Handle Transaction checks if the active network map is in the cache.
3. If the active network map is not in cache, Handle Transaction fetches the network map from the database.
4. The network map is saved in Redis cache for faster processing.
5. Handle Transaction deduplicates all rules in the network map.
6. The transaction is sent to all rules for processing.
7. The Rule Processor returns the result, indicating if the rule was processed successfully or if there was a failure.
8. Handle Transaction returns the final result to the caller.
