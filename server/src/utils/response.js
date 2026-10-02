export function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function created(res, data) {
  return ok(res, data, 201);
}

export function fail(res, { status, code, message, details }) {
  const body = { success: false, message, code };
  if (details) body.details = details;
  return res.status(status).json(body);
}
