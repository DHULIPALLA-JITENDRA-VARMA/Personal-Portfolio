import rateLimit from 'express-rate-limit';

const limiter = (windowMs, limit, error, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error }, ...extra });

// Built per app instance so each test (and each process) gets its own counters.
export const createRateLimits = () => ({
  // Only failed attempts count, so a legitimate admin is never locked out by their own activity.
  login: limiter(15 * 60 * 1000, 5, 'Too many login attempts. Try again in 15 minutes.', {
    skipSuccessfulRequests: true,
  }),
  contact: limiter(60 * 60 * 1000, 5, 'Too many messages from this address. Try again later.'),
  track: limiter(60 * 1000, 60, 'Too many tracking events.'),
  api: limiter(60 * 1000, 300, 'Too many requests.'),
});
