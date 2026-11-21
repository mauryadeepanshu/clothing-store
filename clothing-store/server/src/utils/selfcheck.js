/* Smoke test that loads the whole app without a database and checks routing, auth guards and errors. */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'x'.repeat(40);
process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('../app');

const server = http.createServer(app).listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const checks = [
    ['GET', '/api/health', 200],
    ['GET', '/api/payments/config', 200],
    ['GET', '/api/auth/me', 401],
    ['GET', '/api/admin/stats', 401],
    ['POST', '/api/auth/register', 400, { email: 'bad' }],
    ['GET', '/api/does-not-exist', 404],
  ];
  let failed = 0;
  for (const [method, path, expected, body] of checks) {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    const ok = r.status === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${method} ${path} -> ${r.status}`);
  }
  server.close();
  process.exit(failed ? 1 : 0);
});
