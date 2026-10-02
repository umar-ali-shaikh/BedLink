import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const idParams = z.object({ id: objectId });

/** API coordinates `{ lat, lng }` (RULES.md §4). */
export const coordinates = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Array of enum values, deduplicated. */
export const enumList = (values) =>
  z
    .array(z.enum(values))
    .max(values.length * 2)
    .transform((list) => [...new Set(list)]);

/** `?status=A,B` → `{ statuses: ['A', 'B'] }` validated against `values`. */
export const statusListQuery = (values) =>
  z
    .strictObject({ status: z.string().optional() })
    .transform(({ status }) => ({
      statuses: status
        ? status
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    }))
    .pipe(z.object({ statuses: z.array(z.enum(values)).optional() }));

export const booleanString = z.enum(['true', 'false']).transform((v) => v === 'true');
