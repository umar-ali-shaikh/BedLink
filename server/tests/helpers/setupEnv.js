// Runs before any test module is imported, so config/env.js sees these values.
process.env.NODE_ENV = 'test';
// Hermetic: never inherit a real deployment's database, origins or switches.
process.env.MONGO_URI = 'mongodb://127.0.0.1:1/bedlink-test-placeholder';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
for (const key of [
  'COOKIE_SAMESITE',
  'COOKIE_SECURE',
  'COOKIE_DOMAIN',
  'TRUST_PROXY',
  'SERVE_CLIENT_DIR',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'HOSPITAL_AUTO_VERIFY',
  'AMBULANCE_AUTO_VERIFY',
  'SEED_DEMO_ON_EMPTY',
  'REGISTRATION_ENABLED',
  'DNS_SERVERS',
  'RENDER',
]) {
  delete process.env[key];
}
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.MONGO_TRANSACTIONS = 'true';
process.env.OFFER_TIMEOUT_SECONDS = '120';
process.env.LOG_LEVEL = 'error';
// Booking limits: high by default so tests can create many; limit tests lower them at runtime.
process.env.BOOKING_RATE_LIMIT_PER_IP_PER_HOUR = '1000';
process.env.BOOKING_RATE_LIMIT_PER_PHONE_PER_HOUR = '100';
process.env.BOOKING_OFFER_TIMEOUT_SECONDS = '60';
