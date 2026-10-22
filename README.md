# Thi thử

Đăng nhập → chọn chủ đề → làm bài thi có giờ → nộp bài: server chấm điểm và lưu lịch sử thi của từng người.

```
thi-thu/
├── backend/            API Node.js (không framework) + Postgres
│   ├── server.mjs      Route API, đăng nhập (token), CORS
│   ├── db.mjs          Kết nối Postgres, tự tạo bảng khi khởi động
│   ├── bank.mjs        Đọc đề từ Excel
│   ├── lib.mjs         Hàm thuần: đọc dòng Excel, chấm bài (có test)
│   └── de-thi/         File đề .xlsx
└── frontend/           React + Vite (SPA tĩnh)
    └── src/            App, Login, Home, History, Exam, ConfirmDialog
```

## Chạy local

Cần Node 20+ và một Postgres (dùng luôn database Neon miễn phí, xem bên dưới).

```bash
cd backend
npm install
cp .env.example .env      # điền DATABASE_URL
npm run dev               # API: http://127.0.0.1:3100
```

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (tự chuyển /api sang backend)
```

Test backend: `cd backend && npm test`.

## Đề thi

File `.xlsx` trong `backend/de-thi/`. App đọc mọi sheet có dòng 1 là tiêu đề gồm các cột (thứ tự tùy ý, có thể thêm cột khác như `STT`):

| Chủ đề | Câu hỏi | A | B | C | D | Đáp án |
|---|---|---|---|---|---|---|
| CD | Nội dung câu hỏi | Phương án A | Phương án B | Phương án C | Phương án D | 1–4 (ứng với A–D) |

Chủ đề lấy theo cột `Chủ đề`. Sheet thiếu cột nào trong số trên bị bỏ qua; dòng thiếu nội dung hoặc đáp án không phải 1–4 cũng bị bỏ qua. Sửa Excel là app nhận ngay, không cần khởi động lại. Đáp án không gửi xuống trình duyệt; server chấm khi nộp bài.

## Deploy (miễn phí)

**1. Database: Neon** (https://neon.tech)
- Tạo project (chọn region Singapore) → Connect → copy connection string, đổi `sslmode=require` thành `sslmode=verify-full`.
- Bảng tự tạo khi backend khởi động lần đầu.

**2. App (backend + giao diện): Render** (https://render.com) → New → Web Service → chọn repo
- Root Directory: để trống (gốc repo) · Build: `npm install` · Start: `npm start`
  (`package.json` ở gốc tự cài `backend/`, cài và build `frontend/`; backend phục vụ cả API `/api/...` lẫn giao diện, cùng một URL)
- Environment: `DATABASE_URL` (từ Neon). Không cần `CORS_ORIGIN` hay `VITE_API_URL` vì giao diện và API cùng domain.
- Health check path: `/api/health`
- Gói free ngủ sau ~15 phút không dùng; lần mở đầu tiên sau đó mất khoảng nửa phút đến một phút.

**Tùy chọn: frontend riêng trên Vercel** → Root Directory `frontend`, Framework Vite, `VITE_API_URL` = URL Render; trên Render đặt `CORS_ORIGIN` = URL Vercel. Đổi `VITE_API_URL` thì phải build lại frontend (Vite nhúng giá trị lúc build).
