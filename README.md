# MCM Client

TypeScript client for managing certificates and configuration with the Mojaloop Connection Manager. Automatically handles cert lifecycle, renewals, and Hub synchronization using HashiCorp Vault.

## Installation

```bash
npm install @pm4ml/mcm-client
```

## Usage

```javascript
const { ConnectionStateMachine, Vault } = require('@pm4ml/mcm-client');

const vault = new Vault({
  endpoint: 'https://vault.example.com',
  auth: { k8s: { role: 'dfsp-role', jwt: token } }
});

const machine = ConnectionStateMachine.create({
  logger: yourLogger,
  vault: vault,
  refreshIntervalSeconds: 300,
  certExpiryThresholdDays: 30
});

machine.start();
```

## What it manages

- DFSP and Hub certificates (CA, client, server)
- JWS key generation and peer sync
- Endpoint and connector configuration
- Real-time updates via WebSocket

Uses XState to run 11 parallel workflows. State persists to Vault so it survives restarts. Certificates auto-renew before expiration.

## Development

```bash
npm run build              # Compile
npm test                   # Run tests
npm run lint              # Check code style
```

