# Architecture Overview

RKix Storage Center hiện là ứng dụng TypeScript full-stack nhẹ gồm React frontend, Express backend và lớp lưu trữ JSON mô phỏng.

## Thành phần chính

```text
Browser
  │
  ▼
React + Vite UI (src/)
  │ fetch /api/*
  ▼
Express server (server.ts)
  ├─ Project API
  ├─ Storage Tree API
  ├─ Backup API
  ├─ Archive API
  ├─ System stats/logs/notifications API
  └─ Gemini AI Assistant API
      │
      ▼
Local JSON runtime store (data_store.json)
```

## Frontend

- `src/main.tsx`: bootstrap React app.
- `src/App.tsx`: shell UI chính, state management phía client và các thao tác gọi API.
- `src/components/DashboardStats.tsx`: widget thống kê dashboard.
- `src/types.ts`: kiểu dữ liệu dùng chung cho project, storage, backup, notification, audit log và archive.
- `src/index.css`: Tailwind CSS v4 theme tokens, font và style nền tảng.

## Backend

- `server.ts` khởi tạo Express app, đọc `.env`, mount JSON middleware và phục vụ API.
- Khi `NODE_ENV` không phải production, server dùng Vite middleware để hỗ trợ HMR/dev transform.
- Khi production, server phục vụ static asset từ `dist`.

## Lưu trữ dữ liệu

- Dữ liệu mặc định nằm trong constants của `server.ts`.
- Runtime state được ghi vào `data_store.json` bằng `saveDb()`.
- Không dùng `data_store.json` như nguồn dữ liệu production dài hạn. Khi nâng cấp thật, nên thay bằng PostgreSQL + object storage tương thích S3/MinIO.

## Luồng dữ liệu tiêu biểu

1. Frontend gọi endpoint `/api/projects` để lấy danh sách project.
2. Người dùng tạo project từ UI.
3. Server validate tên project, tạo metadata, đồng bộ node tương ứng trong storage tree.
4. Server ghi audit log, notification và lưu lại state.
5. Frontend refresh dữ liệu hoặc cập nhật state để hiển thị kết quả.

## Hướng mở rộng khuyến nghị

- Tách API route ra các module riêng khi `server.ts` tiếp tục tăng kích thước.
- Thêm schema validation cho request body (ví dụ Zod) trước khi triển khai production.
- Tách seed data thành file riêng để dễ test và reset dữ liệu.
- Thêm test tự động cho helper xử lý storage tree và API critical path.
- Thay JSON store bằng database có migration khi dữ liệu cần bền vững.
