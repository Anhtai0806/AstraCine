# 🎬 AstraCine Admin UI

Admin interface đơn giản để test các API backend của AstraCine.

## 🚀 Quick Start

### 1. Cài đặt
```bash
npm install
```

### 2. Chạy Backend
Đảm bảo Spring Boot backend đang chạy tại `http://localhost:8080`

### 3. Chạy Frontend
```bash
npm start
```

Mở trình duyệt tại: `http://localhost:3000`

## ✨ Features

### 🎭 Genre Management
- Tạo, sửa, xóa genres
- Danh sách tất cả genres

### 🎥 Movie Management
- Tạo, sửa, xóa movies
- Upload poster images
- Tìm kiếm theo title
- Filter theo status và genre
- Multiple genre selection

## 📡 API Endpoints

**Base URL**: `http://localhost:8080`

### Genres
- `GET /admin/genres` - Get all
- `POST /admin/genres` - Create
- `PUT /admin/genres/{id}` - Update
- `DELETE /admin/genres/{id}` - Delete

### Movies
- `GET /admin/movies` - Get all
- `GET /admin/movies/search?title=...` - Search
- `POST /admin/movies` - Create (multipart)
- `PUT /admin/movies/{id}` - Update (multipart)
- `DELETE /admin/movies/{id}` - Delete

## 🎨 Tech Stack

- React 19
- React Router DOM
- Axios
- Modern CSS with gradients & animations

## 📝 Notes

- Poster images: JPEG, PNG, WebP (max 10MB)
- Tạo genres trước khi tạo movies
- Backend phải enable CORS cho `http://localhost:3000`
