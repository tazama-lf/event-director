// SPDX-License-Identifier: Apache-2.0

import { deserialize, validateEnvelope, inAudience, ServiceChannelType, type NetworkMapActivatedData } from '@tazama-lf/frms-coe-lib';
import type { CloudEvent } from 'cloudevents';
import { configuration, loggerService, nodeCache } from '..';
import * as util from 'node:util';

/**
 * Evicts every cached network map entry for a single tenant. The cache is keyed `${tenantId}:${txTp}`
 * (see logic.service.ts), so a tenant's entries are exactly the keys prefixed with `${tenantId}:`.
 */
const evictNetworkMap = (tenantId: string): void => {
  const staleKeys = nodeCache.keys().filter((key) => key.startsWith(`${tenantId}:`));
  if (staleKeys.length > 0) {
    nodeCache.del(staleKeys);
    loggerService.log(`Evicted ${staleKeys.length} cached network map entries for tenant: ${tenantId}`);
  } else {
    loggerService.debug(`No cached network map to evict for tenant: ${tenantId}`);
  }
};

const handleNetworkMapActivated = (event: CloudEvent<NetworkMapActivatedData>): void => {
  const tenantId = event.data?.tenantId;
  if (!tenantId) {
    loggerService.warn(`Discarding ${event.type} event with no tenantId`);
    return;
  }
  evictNetworkMap(tenantId);
};

const dispatchTable: Record<string, (event: CloudEvent<NetworkMapActivatedData>) => void> = {
  [ServiceChannelType.NETWORK_MAP_ACTIVATED]: handleNetworkMapActivated,
};

/**
 * The service-channel receive seam: validate, dispatch, cache-bust. Decodes the structured-mode
 * CloudEvent bytes, re-checks the envelope, gates on audience, then dispatches on the `type` verb.
 * Every rejection path drops the message without throwing so a single bad message can never tear down
 * the subscription.
 */
export const handleServiceChannelMessage = (data: Uint8Array): void => {
  let event: CloudEvent<NetworkMapActivatedData>;
  try {
    event = deserialize<NetworkMapActivatedData>(data);
    validateEnvelope(event);
  } catch (err) {
    loggerService.warn(`Discarding malformed service-channel message: ${util.inspect(err)}`);
    return;
  }

  const handler = dispatchTable[event.type];
  if (!handler) {
    loggerService.warn(`Discarding service-channel message of unknown type: ${event.type}`);
    return;
  }

  const { audience } = event as unknown as { audience?: unknown };
  if (
    !inAudience(typeof audience === 'string' ? audience : undefined, {
      class: configuration.SERVICE_CHANNEL_CLASS,
      functionName: configuration.functionName,
    })
  ) {
    loggerService.debug(
      `Ignoring service-channel message not addressed to ${configuration.SERVICE_CHANNEL_CLASS} (audience: ${String(audience)})`,
    );
    return;
  }

  handler(event);
};
