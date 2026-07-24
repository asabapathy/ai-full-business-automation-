export const config = {
  REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  DATABASE_URL: process.env['DATABASE_URL'] ?? '',
  ANTHROPIC_API_KEY: process.env['ANTHROPIC_API_KEY'] ?? '',
  SENDGRID_API_KEY: process.env['SENDGRID_API_KEY'] ?? '',
  TWILIO_ACCOUNT_SID: process.env['TWILIO_ACCOUNT_SID'] ?? '',
  TWILIO_AUTH_TOKEN: process.env['TWILIO_AUTH_TOKEN'] ?? '',
  TWILIO_FROM_NUMBER: process.env['TWILIO_FROM_NUMBER'] ?? '',
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  CONCURRENCY: parseInt(process.env['WORKER_CONCURRENCY'] ?? '5', 10),
}
