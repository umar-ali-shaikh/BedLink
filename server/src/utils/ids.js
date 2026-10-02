/** Normalise an ObjectId / populated doc / string to a string id. */
export function idOf(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
}

export const sameId = (a, b) => a != null && b != null && idOf(a) === idOf(b);
