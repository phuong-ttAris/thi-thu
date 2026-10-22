import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('Thiếu biến môi trường DATABASE_URL (chuỗi kết nối Postgres, ví dụ từ Neon)');

// Neon yêu cầu SSL: dùng ?sslmode=verify-full trong chuỗi kết nối để pg bật SSL và kiểm tra chứng chỉ.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX) || 5 });

// Tạo bảng nếu chưa có; chạy mỗi lần khởi động, an toàn khi chạy lại.
export async function migrate() {
  await pool.query(`
    create table if not exists users (
      id uuid primary key,
      username text not null,
      salt text not null,
      hash text not null,
      created_at timestamptz not null default now()
    );
    create unique index if not exists users_username_lower on users (lower(username));
    create table if not exists sessions (
      token_hash text primary key,
      user_id uuid not null references users(id) on delete cascade,
      expires_at timestamptz not null
    );
    create table if not exists results (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      topic text not null,
      correct integer not null,
      total integer not null,
      score double precision not null,
      duration_sec integer,
      created_at timestamptz not null default now()
    );
    create index if not exists results_user_created on results (user_id, created_at desc);
  `);
}
