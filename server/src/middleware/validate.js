import { HttpError } from './errors.js';

// Parses req[source] with a zod schema and stores the typed result on req.valid[source].
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new HttpError(400, 'Validation failed', details));
  }
  req.valid = { ...req.valid, [source]: result.data };
  return next();
};

export const parseId = (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next(new HttpError(400, 'Invalid id'));
  req.id = id;
  return next();
};
