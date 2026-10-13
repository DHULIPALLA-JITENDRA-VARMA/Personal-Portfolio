import multer from 'multer';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
}

export const notFound = (req, res) => res.status(404).json({ error: 'Not found' });

// Every failure leaves the API as `{ error: string, details?: [...] }`.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? 'File is too large' : `Upload failed: ${err.message}` });
  }
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });

  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
  const body = { error: status < 500 || err.expose ? err.message : 'Internal server error' };
  if (err.details) body.details = err.details;
  return res.status(status).json(body);
}
