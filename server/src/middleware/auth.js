import jwt from 'jsonwebtoken';
import { HttpError } from './errors.js';

export const COOKIE_NAME = 'portfolio_session';
const SESSION_SECONDS = 8 * 60 * 60;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function createAuth(config) {
  const cookieOptions = {
    httpOnly: true, // not readable from JS, so an XSS bug cannot steal the session
    sameSite: 'strict', // never sent on cross-site requests
    secure: config.cookieSecure, // HTTPS-only in production
    path: '/api',
  };

  const issueSession = (res, admin) => {
    const token = jwt.sign({ sub: String(admin.id), username: admin.username }, config.serverSecret, {
      algorithm: 'HS256',
      expiresIn: SESSION_SECONDS,
    });
    res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
  };

  const clearSession = (res) => res.clearCookie(COOKIE_NAME, cookieOptions);

  const requireAuth = (req, res, next) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return next(new HttpError(401, 'Authentication required'));
    try {
      const payload = jwt.verify(token, config.serverSecret, { algorithms: ['HS256'] });
      req.admin = { id: Number(payload.sub), username: payload.username };
      return next();
    } catch {
      return next(new HttpError(401, 'Session expired or invalid'));
    }
  };

  // CSRF defence in depth on top of SameSite=Strict. A cross-site <form> or <img> cannot set a
  // custom header, and a cross-site fetch() that tries to triggers a CORS preflight which this
  // server only approves for CLIENT_ORIGIN. So requiring the header proves the request was made
  // by our own frontend code, without needing per-session CSRF tokens.
  const requireCsrfHeader = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    if (req.get('x-requested-with') !== 'portfolio') {
      return next(new HttpError(403, 'Missing or invalid x-requested-with header'));
    }
    return next();
  };

  return { issueSession, clearSession, requireAuth, requireCsrfHeader };
}
