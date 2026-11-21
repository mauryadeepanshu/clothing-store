/**
 * Strips keys that start with '$' or contain '.' from body, query and params, so a request like
 * {"email": {"$gt": ""}} or ?status[$ne]=x can't smuggle MongoDB operators into a query.
 */
function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) { delete value[key]; continue; }
    value[key] = clean(value[key], depth + 1);
    // An object emptied by the stripping (e.g. ?status[$ne]=x) is removed rather than passed on as {}.
    const v = value[key];
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) delete value[key];
  }
  return value;
}

module.exports = (req, _res, next) => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) clean(req.body);
  clean(req.query);
  clean(req.params);
  next();
};
