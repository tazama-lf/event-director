// SPDX-License-Identifier: Apache-2.0

process.env.FUNCTION_NAME = 'event-director';
process.env.NODE_ENV = 'test';
process.env.MAX_CPU = '1';
process.env.SERVICE_CHANNEL_CLASS = 'event-director';
process.env.SERVICE_CHANNEL_CONSUMER = 'service-channel';
process.env.SERVICE_CHANNEL_PRODUCER = 'service-channel-ack';
process.env.SERVICE_CHANNEL_SOURCE_URI_PREFIX = '';

process.env.APM_ACTIVE = 'false';
process.env.APM_SERVICE_NAME = 'test';
process.env.APM_URL = 'test';
