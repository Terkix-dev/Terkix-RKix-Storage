# API Reference

Base URL local: `http://localhost:3000`.

Tất cả request/response API hiện dùng JSON. Các endpoint mô phỏng thao tác lưu trữ, backup, archive và Git để phục vụ UI dashboard.

## Projects

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/projects` | Lấy danh sách project. |
| `POST` | `/api/projects` | Tạo project mới và thư mục storage tương ứng. |
| `PUT` | `/api/projects/:id` | Cập nhật metadata, status, repo URL, tags hoặc branch hiện tại. |
| `DELETE` | `/api/projects/:id` | Xóa project và chuyển thư mục vào Trash. |
| `POST` | `/api/projects/:id/test-connection` | Kiểm tra khả năng truy cập repository URL. |
| `POST` | `/api/projects/:id/git-action` | Mô phỏng thao tác Git như pull, push, branch/sync. |

### Tạo project

```json
{
  "name": "rkix-new-service",
  "description": "New storage service",
  "status": "Development",
  "repoUrl": "https://github.com/terkix/rkix-new-service",
  "owner": "developer@example.com",
  "tags": ["TypeScript", "Storage"]
}
```

## Storage Tree

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/storage-tree` | Lấy cây thư mục/file hiện tại. |
| `POST` | `/api/storage-tree/item` | Tạo file hoặc folder mới trong node cha. |
| `POST` | `/api/storage-tree/move` | Di chuyển node sang folder khác. |
| `POST` | `/api/storage-tree/rename` | Đổi tên node. |
| `DELETE` | `/api/storage-tree/item/:id` | Chuyển node vào Trash hoặc xóa khỏi tree tùy vị trí. |
| `POST` | `/api/storage-tree/empty-trash` | Làm rỗng Trash. |

## Backups

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/backups` | Lấy lịch sử backup. |
| `POST` | `/api/backups` | Tạo backup mô phỏng. |
| `POST` | `/api/backups/:id/restore` | Restore từ backup thành công. |

## Archive

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/archive/list` | Lấy danh sách archive ZIP đã tạo. |
| `POST` | `/api/archive/zip` | Nén mô phỏng nhiều project thành ZIP archive. |

## System

| Method | Path | Mục đích |
| --- | --- | --- |
| `GET` | `/api/system/notifications` | Lấy notification. |
| `POST` | `/api/system/notifications/read` | Đánh dấu một hoặc tất cả notification là đã đọc. |
| `GET` | `/api/system/logs` | Lấy audit log. |
| `GET` | `/api/system/stats` | Lấy thống kê dung lượng và phân loại storage. |

## AI Assistant

| Method | Path | Mục đích |
| --- | --- | --- |
| `POST` | `/api/ai/chat` | Gửi câu hỏi tới Gemini với context dự án/storage hiện tại. |

Request mẫu:

```json
{
  "message": "Tóm tắt các dự án đang chiếm nhiều dung lượng nhất",
  "activeProjectId": "proj-rkix01",
  "activeFolderId": "dir-active"
}
```

Endpoint này yêu cầu `GEMINI_API_KEY` hợp lệ.
