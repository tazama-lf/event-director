// SPDX-License-Identifier: Apache-2.0
import { Apm } from '@frmscoe/frms-coe-lib/lib/services/apm';
import { configuration } from './config';

const apm = new Apm({
  serviceName: configuration.functionName,
  secretToken: configuration.apmSecretToken,
  serverUrl: configuration.apmURL,
  usePathAsTransactionName: true,
  active: configuration.apmLogging,
  transactionIgnoreUrls: ['/health'],
});

export default apm;
