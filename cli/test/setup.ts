// Test environment setup — loaded via mocha --require
// Sets test credentials and disables HTTP retries for fast, deterministic tests.

process.env.ACCOUNT_ID = "AC1234567890123456789012345678901234567890"
process.env.API_KEY = "abc123def456abc123def456abc123def456abc12"
process.env.FREECLIMB_MAX_RETRIES = "0"
