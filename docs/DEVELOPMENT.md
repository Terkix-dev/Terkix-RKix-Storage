# Development Guide

Tài liệu này chuẩn hóa cách chạy, kiểm tra và mở rộng RKix Storage Center trong môi trường local.

## Yêu cầu môi trường

- Node.js 20 LTS (xem `.nvmrc`).
- npm 11+ hoặc phiên bản npm đi kèm môi trường triển khai.
- Gemini API key nếu cần sử dụng AI Assistant.

## Cài đặt nhanh

```bash
npm ci
cp .env.example .env
npm run dev
```

Ứng dụng chạy mặc định tại `http://localhost:3000`.

## Biến môi trường

| Biến | Bắt buộc | Mục đích |
| --- | --- | --- |
| `GEMINI_API_KEY` | Chỉ bắt buộc khi dùng `/api/ai/chat` | Khóa API cho Gemini AI Assistant. |
| `APP_URL` | Không bắt buộc ở local | URL public của app khi triển khai. |

## Lệnh phát triển

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy Express + Vite middleware ở chế độ phát triển. |
| `npm run lint` | Type-check bằng TypeScript (`tsc --noEmit`). |
| `npm run build` | Build frontend Vite và bundle server bằng esbuild. |
| `npm run start` | Chạy bundle production ở `dist/server.cjs`. |
| `npm run clean` | Xóa output build. |

## Quy trình khuyến nghị trước khi mở PR

1. Đồng bộ branch mới nhất.
2. Chạy `npm ci` nếu `package-lock.json` thay đổi.
3. Chạy `npm run lint`.
4. Chạy `npm run build`.
5. Kiểm tra UI thủ công các luồng chính:
   - Dashboard tổng quan.
   - Tạo/sửa/xóa project.
   - Storage Explorer.
   - Backup/restore mô phỏng.
   - Archive ZIP mô phỏng.
   - AI Assistant nếu có `GEMINI_API_KEY`.

## Ghi chú dữ liệu local

Server tạo và cập nhật file `data_store.json` tại thư mục gốc khi ứng dụng chạy. File này là dữ liệu runtime local và không nên commit.
