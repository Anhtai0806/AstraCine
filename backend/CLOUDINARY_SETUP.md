# Cloudinary Integration Guide

## 🌐 Cloudinary Setup

### 1. Create Cloudinary Account
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. After login, go to Dashboard
4. Copy your credentials:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Configure Application

#### Option A: Using Environment Variables (Recommended for Production)
```bash
# Windows
set CLOUDINARY_CLOUD_NAME=your_cloud_name
set CLOUDINARY_API_KEY=your_api_key
set CLOUDINARY_API_SECRET=your_api_secret

# Linux/Mac
export CLOUDINARY_CLOUD_NAME=your_cloud_name
export CLOUDINARY_API_KEY=your_api_key
export CLOUDINARY_API_SECRET=your_api_secret
```

#### Option B: Update application.properties (For Development)
```properties
cloudinary.cloud-name=your_cloud_name
cloudinary.api-key=your_api_key
cloudinary.api-secret=your_api_secret
cloudinary.folder=astracine/posters
```

### 3. How It Works

#### Upload Flow
1. User uploads image via `POST /api/admin/movies`
2. `FileStorageService.storeFile()` uploads to Cloudinary
3. Cloudinary returns secure HTTPS URL
4. URL is saved in database (`poster_url` field)
5. Frontend displays image directly from Cloudinary CDN

#### Delete Flow
1. When movie is deleted or poster updated
2. `FileStorageService.deleteFile()` extracts public ID from URL
3. Cloudinary deletes the image
4. Database record is updated/removed

### 4. Benefits of Cloudinary

✅ **CDN Delivery** - Fast image loading worldwide
✅ **Auto Optimization** - Automatic format conversion (WebP, AVIF)
✅ **Transformations** - Resize, crop, compress on-the-fly
✅ **No Server Storage** - No disk space needed
✅ **Scalability** - Handle millions of images
✅ **Security** - HTTPS URLs, access control

### 5. Image URLs

Uploaded images will have URLs like:
```
https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/astracine/posters/abc-123-def.jpg
```

### 6. Testing

#### Create Movie with Poster
```bash
curl -X POST http://localhost:8080/api/admin/movies \
  -F "title=Test Movie" \
  -F "description=Testing Cloudinary" \
  -F "durationMinutes=120" \
  -F "status=SHOWING" \
  -F "genreIds=1" \
  -F "poster=@/path/to/image.jpg"
```

#### Response
```json
{
  "id": 1,
  "title": "Test Movie",
  "posterUrl": "https://res.cloudinary.com/demo/image/upload/v1234567890/astracine/posters/abc-123.jpg",
  ...
}
```

### 7. Free Tier Limits

- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Images**: Unlimited

Perfect for development and small-medium projects!

### 8. Troubleshooting

**Error: "Invalid credentials"**
- Check your Cloud Name, API Key, and API Secret
- Make sure no extra spaces in configuration

**Error: "Upload failed"**
- Check internet connection
- Verify file is valid image (JPEG, PNG, WebP)
- Check file size (max 10MB)

**Images not displaying**
- Verify URL is HTTPS
- Check CORS settings in Cloudinary dashboard
- Ensure URL is publicly accessible

### 9. Advanced Features (Optional)

#### Image Transformations
Cloudinary can transform images on-the-fly:
```
# Original
https://res.cloudinary.com/.../astracine/posters/abc-123.jpg

# Resized to 300x400
https://res.cloudinary.com/.../w_300,h_400/astracine/posters/abc-123.jpg

# Auto quality, WebP format
https://res.cloudinary.com/.../q_auto,f_auto/astracine/posters/abc-123.jpg
```

You can add these transformations in your frontend when displaying images!
