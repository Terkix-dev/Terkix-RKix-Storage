# Contributing

Cảm ơn bạn đã đóng góp cho RKix Storage Center. Hãy dùng quy trình dưới đây để giữ dự án dễ phát triển và dễ review.

## Thiết lập local

```bash
npm ci
cp .env.example .env
npm run dev
```

## Chuẩn chất lượng

Trước khi gửi thay đổi, hãy chạy:

```bash
npm run lint
npm run build
```

## Quy ước code

- Dùng TypeScript cho frontend và backend.
- Giữ kiểu dữ liệu dùng chung trong `src/types.ts` khi UI và API cùng phụ thuộc.
- Không commit secret, `.env`, `data_store.json`, `dist`, `node_modules` hoặc file log.
- Ưu tiên component nhỏ, dễ đọc nếu tách UI mới khỏi `src/App.tsx`.
- Nếu thêm endpoint API, cập nhật `docs/API.md`.
- Nếu thay đổi cấu trúc hệ thống, cập nhật `docs/ARCHITECTURE.md`.

## Quy ước commit gợi ý

Dùng commit message ngắn, rõ ràng:

- `feat: add project search filters`
- `fix: handle missing backup payload`
- `docs: document storage tree api`
- `chore: update development tooling`

## Checklist pull request

- [ ] Mô tả thay đổi chính.
- [ ] Cập nhật tài liệu liên quan.
- [ ] Chạy `npm run lint`.
- [ ] Chạy `npm run build`.
- [ ] Kiểm tra UI thủ công nếu thay đổi giao diện.
