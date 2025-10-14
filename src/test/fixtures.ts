import { ProgressMonitor } from '../../src/lib/stateMachine/states';

export const createProgressMonitorEntry = ({
    status = ProgressMonitor.ProgressState.PENDING,
    lastUpdated = null,
    stateDescription = '',
    retries = 0,
    error = '',
} = {} as Partial<ProgressMonitor.ProgressMonitorEntry>): ProgressMonitor.ProgressMonitorEntry => ({
    status,
    lastUpdated,
    ...(stateDescription && { stateDescription }),
    ...(retries && { retries }),
    ...(error && { error }),
});

export const createProgressMonitorContext = ({
    PEER_JWS = createProgressMonitorEntry(),
    DFSP_JWS = createProgressMonitorEntry(),
    DFSP_CA = createProgressMonitorEntry(),
    DFSP_SERVER_CERT = createProgressMonitorEntry(),
    DFSP_CLIENT_CERT = createProgressMonitorEntry(),
    HUB_CA = createProgressMonitorEntry(),
    HUB_CERT = createProgressMonitorEntry(),
    ENDPOINT_CONFIG = createProgressMonitorEntry(),
} = {}): ProgressMonitor.Context => ({
    progressMonitor: {
        PEER_JWS,
        DFSP_JWS,
        DFSP_CA,
        DFSP_SERVER_CERT,
        DFSP_CLIENT_CERT,
        HUB_CA,
        HUB_CERT,
        ENDPOINT_CONFIG,
    },
});
