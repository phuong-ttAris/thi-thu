import http from 'node:http';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool, migrate } from './db.mjs';
import { readXlsxBank } from './bank.mjs';
import { gradeExam, validUsername } from './lib.mjs';

const PORT = Number(process.env.PORT) || 3100;
// Render tự đặt biến RENDER và cần app nghe trên 0.0.0.0; chạy local thì chỉ nghe trong máy.
const HOST = process.env.HOST || (process.env.RENDER ? '0.0.0.0' : '127.0.0.1');
// Domain frontend được gọi API, cách nhau dấu phẩy, ví dụ https://thi-thu.vercel.app
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((s) => s.trim()).filter(Boolean);
const SESSION_DAYS = 30;
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}
async function checkPassword(user, password) {
  const { hash } = await hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

// Token đăng nhập gửi qua header Authorization (FE và BE khác domain). DB chỉ lưu hash của token.
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const bearer = (req) => /^Bearer ([0-9a-f]{64})$/.exec(req.headers.authorization || '')?.[1];

async function startSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query('delete from sessions where expires_at < now()');
  await pool.query('insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))',
    [tokenHash(token), userId, SESSION_DAYS]);
  return token;
}

async function currentUser(req) {
  const token = bearer(req);
  const { rows } = token ? await pool.query(
    'select u.id, u.username from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()',
    [tokenHash(token)]) : { rows: [] };
  if (!rows[0]) throw Object.assign(new Error('Chưa đăng nhập'), { status: 401 });
  return rows[0];
}

function readBody(req, limit = 200_000) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Dữ liệu quá lớn'), { status: 413 })); req.destroy(); }
      else parts.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(parts).toString() || '{}')); }
      catch { reject(Object.assign(new Error('JSON không hợp lệ'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
};

const routes = {
  'GET /api/health': async (req, res) => {
    await pool.query('select 1');
    send(res, 200, { ok: true });
  },
  'POST /api/register': async (req, res) => {
    const { username, password } = await readBody(req);
    if (!validUsername(username)) return send(res, 400, { error: 'Tên đăng nhập 3–32 ký tự: chữ không dấu, số, dấu . _ -' });
    if (typeof password !== 'string' || password.length < 6 || password.length > 200) return send(res, 400, { error: 'Mật khẩu tối thiểu 6 ký tự' });
    const { salt, hash } = await hashPassword(password);
    const id = crypto.randomUUID();
    try {
      await pool.query('insert into users (id, username, salt, hash) values ($1, $2, $3, $4)', [id, username, salt, hash]);
    } catch (e) {
      if (e.code === '23505') return send(res, 409, { error: 'Tên đăng nhập đã tồn tại' }); // unique lower(username)
      throw e;
    }
    send(res, 200, { username, token: await startSession(id) });
  },
  'POST /api/login': async (req, res) => {
    const { username, password } = await readBody(req);
    const { rows } = typeof username === 'string'
      ? await pool.query('select id, username, salt, hash from users where lower(username) = lower($1)', [username])
      : { rows: [] };
    const user = rows[0];
    if (!user || typeof password !== 'string' || !(await checkPassword(user, password))) {
      return send(res, 401, { error: 'Sai tên đăng nhập hoặc mật khẩu' });
    }
    send(res, 200, { username: user.username, token: await startSession(user.id) });
  },
  'POST /api/logout': async (req, res) => {
    const token = bearer(req);
    if (token) await pool.query('delete from sessions where token_hash = $1', [tokenHash(token)]);
    send(res, 200, {});
  },
  'GET /api/me': async (req, res) => send(res, 200, { username: (await currentUser(req)).username }),
  // Không gửi đáp án xuống trình duyệt: chấm ở server khi nộp bài.
  'GET /api/bank': async (req, res) => {
    await currentUser(req);
    send(res, 200, (await readXlsxBank()).map(({ answer, ...q }) => q));
  },
  'POST /api/results': async (req, res) => {
    const user = await currentUser(req);
    const { topic, durationSec, answers } = await readBody(req);
    if (!Array.isArray(answers) || answers.length > 1000) return send(res, 400, { error: 'Bài làm không hợp lệ' });
    const { correct, total, key } = gradeExam(await readXlsxBank(), answers);
    if (!total) return send(res, 400, { error: 'Không có câu hỏi hợp lệ trong bài làm' });
    const score = Math.round((correct / total) * 100) / 10;
    await pool.query(
      'insert into results (id, user_id, topic, correct, total, score, duration_sec) values ($1, $2, $3, $4, $5, $6, $7)',
      [crypto.randomUUID(), user.id, typeof topic === 'string' && topic ? topic.slice(0, 200) : 'Tất cả chủ đề',
        correct, total, score, Number.isFinite(durationSec) ? Math.max(0, Math.round(durationSec)) : null],
    );
    send(res, 200, { correct, total, score, key });
  },
  'GET /api/results': async (req, res) => {
    const user = await currentUser(req);
    const { rows } = await pool.query(
      `select id, topic, correct, total, score, duration_sec as "durationSec", created_at as "createdAt"
       from results where user_id = $1 order by created_at desc limit 500`, [user.id]);
    send(res, 200, rows);
  },
  // ?id=<uuid> xóa một bài, không có id thì xóa hết; luôn giới hạn trong bài của chính người dùng.
  'DELETE /api/results': async (req, res) => {
    const user = await currentUser(req);
    const id = new URL(req.url, 'http://x').searchParams.get('id');
    if (id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return send(res, 400, { error: 'id không hợp lệ' });
    const { rowCount } = id
      ? await pool.query('delete from results where id = $1 and user_id = $2', [id, user.id])
      : await pool.query('delete from results where user_id = $1', [user.id]);
    send(res, 200, { deleted: rowCount });
  },
};

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('access-control-max-age', '600');
  }
}

await migrate();
http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const route = routes[`${req.method} ${new URL(req.url, 'http://x').pathname}`];
  if (!route) return send(res, 404, { error: 'Not found' });
  try {
    await route(req, res);
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Lỗi máy chủ' });
  }
}).listen(PORT, HOST, () => console.log(`Thi thử API: http://${HOST}:${PORT}`));
