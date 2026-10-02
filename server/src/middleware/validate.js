import { AppError } from '../utils/AppError.js';

export const zodDetails = (error) =>
  error.issues.map((issue) => ({ path: issue.path.join('.') || '(root)', message: issue.message }));

/**
 * `validate({ body, params, query })` with Zod. Replaces each part with the parsed
 * (coerced, stripped) value. Express 5 exposes `req.query` as a getter, so it is redefined.
 */
export const validate = (schemas) => (req, _res, next) => {
  const details = [];
  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(req[part] ?? {});
    if (!result.success) {
      details.push(...zodDetails(result.error).map((d) => ({ ...d, path: `${part}.${d.path}` })));
      continue;
    }
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true, enumerable: true });
  }
  if (details.length) return next(new AppError('VALIDATION_ERROR', undefined, undefined, details));
  return next();
};
