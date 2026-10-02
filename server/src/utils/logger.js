/** Tiny JSON-lines logger. Never pass secrets, tokens, passwords or request bodies. */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'error' : 'info');

function write(level, msg, meta = {}) {
  if (LEVELS[level] < LEVELS[minLevel]) return;
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...meta });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};

/** Serialise an error for logs without leaking it to clients. */
export const errorMeta = (err) => ({ errName: err?.name, errMessage: err?.message, stack: err?.stack });
