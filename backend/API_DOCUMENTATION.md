# AstraCine Backend - Movie & Genre Management API

## 🎬 Overview
RESTful API for managing movies and genres in the AstraCine cinema management system, built with Spring Boot 3.5.9.

## 📋 Features
- ✅ Complete CRUD operations for Movies and Genres
- ✅ Poster image upload with validation
- ✅ Advanced search and filtering
- ✅ Many-to-many genre relationships
- ✅ Centralized exception handling
- ✅ Request validation

## 🚀 Quick Start

### Prerequisites
- Java 17+
- MySQL 8.0+
- Maven 3.6+

### Database Setup
```sql
-- Run the astracine.sql script
mysql -u ojt -p < astracine.sql
```

### Run Application
```bash
cd backend
mvnw spring-boot:run
```

Server starts at: `http://localhost:8080`

## 📡 API Endpoints

### Genre Endpoints

#### Get All Genres
```http
GET /admin/genres
```

#### Get Genre by ID
```http
GET /admin/genres/{id}
```

#### Create Genre
```http
POST /admin/genres
Content-Type: application/json

{
  "name": "Action"
}
```

#### Update Genre
```http
PUT /admin/genres/{id}
Content-Type: application/json

{
  "name": "Sci-Fi"
}
```

#### Delete Genre
```http
DELETE /admin/genres/{id}
```

---

### Movie Endpoints

#### Get All Movies
```http
GET /admin/movies
GET /admin/movies?status=SHOWING
```

#### Get Movie by ID
```http
GET /admin/movies/{id}
```

#### Search Movies by Title
```http
GET /admin/movies/search?title=avengers
```

#### Get Movies by Genre
```http
GET /admin/movies/genre/{genreId}
```

#### Create Movie (with poster upload)
```http
POST /admin/movies
Content-Type: multipart/form-data

Form Data:
- title: "Avengers: Endgame"
- description: "Epic conclusion"
- durationMinutes: 181
- releaseDate: "2024-01-15"
- endDate: "2024-03-15"
- ageRating: "C13"
- status: "SHOWING"
- trailerUrl: "https://youtube.com/..."
- genreIds: [1, 2, 3]
- poster: [image file]
```

#### Update Movie
```http
PUT /admin/movies/{id}
Content-Type: multipart/form-data

(Same fields as create, poster is optional)
```

#### Delete Movie
```http
DELETE /admin/movies/{id}
```

## 📝 Request/Response Examples

### Create Movie Response
```json
{
  "id": 1,
  "title": "Avengers: Endgame",
  "description": "Epic conclusion to the Infinity Saga",
  "durationMinutes": 181,
  "releaseDate": "2024-01-15",
  "endDate": "2024-03-15",
  "ageRating": "C13",
  "status": "SHOWING",
  "posterUrl": "uploads/posters/abc-123-def.jpg",
  "trailerUrl": "https://youtube.com/watch?v=...",
  "createdAt": "2024-01-10T10:30:00",
  "genres": [
    {"id": 1, "name": "Action"},
    {"id": 2, "name": "Adventure"},
    {"id": 3, "name": "Sci-Fi"}
  ]
}
```

### Error Response
```json
{
  "status": 400,
  "message": "Genre not found with id: 5",
  "timestamp": "2024-01-10T10:30:00"
}
```

### Validation Error Response
```json
{
  "status": 400,
  "errors": {
    "title": "Title is required",
    "durationMinutes": "Duration must be positive"
  },
  "timestamp": "2024-01-10T10:30:00"
}
```

## 🎨 Movie Status Values
- `SHOWING` - Currently showing
- `COMING_SOON` - Upcoming release
- `ENDED` - No longer showing

## 🎭 Age Rating Values
- `P` - General audience
- `C13` - 13 and above
- `C16` - 16 and above
- `C18` - 18 and above

## 📁 File Upload
- **Supported formats**: JPEG, PNG, WebP
- **Max file size**: 10MB
- **Storage location**: `uploads/posters/`
- **Access URL**: `http://localhost:8080/uploads/posters/{filename}`

## ⚙️ Configuration

### Database (application.properties)
```properties
spring.datasource.url=jdbc:mysql://localhost:3307/astracine
spring.datasource.username=ojt
spring.datasource.password=123456
```

### File Upload
```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
file.upload-dir=uploads/posters
```

## 🧪 Testing with cURL

### Create Genre
```bash
curl -X POST http://localhost:8080/api/admin/genres \
  -H "Content-Type: application/json" \
  -d '{"name": "Horror"}'
```

### Get All Movies
```bash
curl http://localhost:8080/admin/movies
```

### Create Movie with Poster
```bash
curl -X POST http://localhost:8080/admin/movies \
  -F "title=Test Movie" \
  -F "description=A test movie" \
  -F "durationMinutes=120" \
  -F "releaseDate=2024-01-15" \
  -F "status=SHOWING" \
  -F "genreIds=1,2" \
  -F "poster=@poster.jpg"
```

## 📦 Dependencies
- Spring Boot 3.5.9
- Spring Data JPA
- Spring Web
- Spring Validation
- MySQL Connector
- Lombok

## 🏗️ Architecture
```
Controller → Service → Repository → Database
     ↓          ↓
   DTO      Entity
```

## 👨‍💻 Author
Built with 20 years of Spring Boot expertise for the AstraCine Cinema Management System.
