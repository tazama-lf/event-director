// SPDX-License-Identifier: Apache-2.0

process.env.FUNCTION_NAME = 'event-director';
process.env.NODE_ENV = 'test';
process.env.MAX_CPU = '1';

process.env.APM_ACTIVE = 'false';
process.env.APM_SERVICE_NAME = 'test';
process.env.APM_URL = 'test';
