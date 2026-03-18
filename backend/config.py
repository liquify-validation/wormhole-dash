"""Configuration for the Wormhole dashboard backend."""

ENDPOINTS = {
    "mainnet_cf": {
        "name": "Mainnet (Cloud Function)",
        "url": "https://europe-west3-wormhole-message-db-mainnet.cloudfunctions.net",
        "type": "cloudfunction",
        "env": "mainnet",
    },
    "mainnet_xlabs": {
        "name": "Mainnet (xLabs)",
        "url": "https://guardian.mainnet.xlabs.xyz",
        "type": "guardian",
        "env": "mainnet",
    },
    "mainnet_mcf": {
        "name": "Mainnet (MCF)",
        "url": "https://wormhole-v2-mainnet-api.mcf.rocks",
        "type": "guardian",
        "env": "mainnet",
    },
    "mainnet_chainlayer": {
        "name": "Mainnet (ChainLayer)",
        "url": "https://wormhole-v2-mainnet-api.chainlayer.network",
        "type": "guardian",
        "env": "mainnet",
    },
    "testnet_cf": {
        "name": "Testnet (Cloud Function)",
        "url": "https://europe-west3-wormhole-message-db-testnet.cloudfunctions.net",
        "type": "cloudfunction",
        "env": "testnet",
    },
    "testnet_xlabs": {
        "name": "Testnet (xLabs)",
        "url": "https://guardian.testnet.xlabs.xyz",
        "type": "guardian",
        "env": "testnet",
    },
}

GUARDIAN_RPC = "https://guardian.mainnet.xlabs.xyz"
WORMHOLESCAN = "https://api.wormholescan.io/api/v1"

# Polling intervals in seconds
HEARTBEAT_INTERVAL = 10
GOVERNOR_INTERVAL = 30
WORMHOLESCAN_INTERVAL = 30
