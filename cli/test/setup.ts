// Test environment setup — loaded via mocha --require
// Sets test credentials and disables HTTP retries for fast, deterministic tests.

process.env.FREECLIMB_KEYRING_SERVICE = "FreeClimbCliTest"
process.env.ACCOUNT_ID = "AC1234567890123456789012345678901234567890"
process.env.API_KEY = "abc123def456abc123def456abc123def456abc12"
process.env.FREECLIMB_MAX_RETRIES = "0"
process.env.FREECLIMB_REQUESTS_PER_SECOND = "10000"
process.env.FREECLIMB_MAX_CONCURRENT_REQUESTS = "1000"
