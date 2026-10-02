// Runs before any test module is imported, so config/env.js sees these values.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI ??= 'mongodb://127.0.0.1:1/bedlink-test-placeholder';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.MONGO_TRANSACTIONS = 'true';
process.env.OFFER_TIMEOUT_SECONDS = '120';
process.env.LOG_LEVEL = 'error';
