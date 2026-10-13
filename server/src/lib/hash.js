import crypto from 'node:crypto';

export const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

// The salt is derived from SERVER_SECRET + the UTC date, so it changes at midnight and
// yesterday's salt is never stored anywhere. Without it, hashes cannot be recomputed.
export const dailySalt = (secret, date = new Date()) => sha256(`${secret}:${utcDay(date)}`);

// Privacy-friendly visitor identity: a one-way hash of ip + user-agent + daily salt.
// - No cookie or localStorage id is needed, so there is nothing to consent to.
// - The raw IP never reaches the database; only this digest does.
// - Because the salt rotates daily, the same person gets a different hash tomorrow:
//   we can count unique visitors per day but cannot follow anyone across days.
export function visitorHash({ ip, userAgent, secret, date = new Date() }) {
  return sha256(`${ip || ''}|${userAgent || ''}|${dailySalt(secret, date)}`);
}

// Contact messages keep a salted (non-rotating) hash so repeat abuse can be spotted without storing the IP.
export const ipHash = (ip, secret) => sha256(`${ip || ''}|${secret}`).slice(0, 32);

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|facebookexternalhit|whatsapp|telegram|discord|preview|scrapy|httpclient/i;

export const isBot = (userAgent) => !userAgent || BOT_UA.test(userAgent);
