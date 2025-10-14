import { Logger } from '@mojaloop/sdk-standard-components';

const logger = Logger.loggerFactory({
    context: { context: 'MCMClient' },
    isJsonOutput: false,
});

export default logger;
