// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: `${process.env.DKA_SENTRY_DSN || 'https://685925e1124407331f1e8ab3ffa2fd18@o4508779127898112.ingest.us.sentry.io/4509285776687104'}`,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});