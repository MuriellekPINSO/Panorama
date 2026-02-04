# Panorama Stitching Server Setup Guide

This is a Node.js backend server that performs advanced panorama stitching using OpenCV and Python.

## What It Does

The server receives 8 photos from your mobile app and:
1. **Detects feature points** in each image using ORB/SIFT algorithms
2. **Matches overlapping regions** between adjacent photos
3. **Calculates geometric transformations** (homography matrices) for alignment
4. **Corrects lens distortion** for wide-angle camera effects
5. **Blends overlapping edges** seamlessly using feathering
6. **Returns a single equirectangular panorama** (2:1 aspect ratio)

Instead of displaying 8 separate photos, your app now shows one seamless 360° panorama!

## Local Setup

### Prerequisites

- Node.js >= 14
- Python 3.7+
- OpenCV for Python

### Installation

1. **Install Node dependencies:**
```bash
cd backend-stitching
npm install
```

2. **Install Python OpenCV:**
```bash
pip install opencv-python numpy
```

Verify OpenCV is installed:
```bash
python3 -c "import cv2; print(f'OpenCV version: {cv2.__version__}')"
```

3. **Run the server:**
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║     🌐 Panorama Stitching Server Started               ║
║     Port: 3000                                         ║
║     Endpoint: POST /api/stitch-panorama                ║
╚════════════════════════════════════════════════════════╝
```

4. **Test the server:**
```bash
curl http://localhost:3000/api/health
```

## Production Deployment

### Option 1: Render.com (Free & Recommended)

1. **Create a GitHub repository** with your backend code
2. **Sign up at** https://render.com
3. **New → Web Service**
4. **Connect your GitHub repo**
5. **Set environment variables:**
   - `PORT`: 3000

**Dockerfile example** (place in `backend-stitching/`):
```dockerfile
FROM python:3.9-slim

# Install Node
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install OpenCV dependencies
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
RUN pip install opencv-python numpy

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

### Option 2: Railway.app (Free tier available)

1. Push to GitHub
2. Sign up at https://railway.app
3. Create new project from GitHub repo
4. Set start command: `npm start`

### Option 3: AWS Lambda + S3 (Serverless)

Panorama stitching is CPU-intensive. For serverless, use:
- **AWS Lambda + GPU** (expensive)
- **ECS Fargate** (more cost-effective)
- Or stick with Option 1 (Render) which is free

## Configuration

### Frontend Configuration

In `app/(tabs)/create.tsx`, set your server URL:

```typescript
const STITCHING_SERVER_URL = process.env.EXPO_PUBLIC_STITCHING_SERVER || 'http://localhost:3000';
```

Or create `.env.local` in your app root:
```
EXPO_PUBLIC_STITCHING_SERVER=https://your-panorama-server.onrender.com
```

### Performance Tuning

Adjust in `server.js`:
- **Image resize height**: Currently 1024px (reduce for faster processing)
- **Confidence threshold**: 0.3 (lower = more lenient matching)
- **Timeout**: 300,000ms (5 min, increase if needed)

## Troubleshooting

### "Python not found"
```bash
# Make sure Python 3 is in PATH
python3 --version
```

### "ModuleNotFoundError: No module named 'cv2'"
```bash
pip install opencv-python
```

### "Failed to stitch"
- Check image quality (needs good overlap ~30%)
- Ensure photos are in 45° intervals
- Verify lighting consistency across photos

### Server not responding
```bash
# Check if port 3000 is in use
netstat -tuln | grep 3000
# Kill process if needed
kill -9 <PID>
```

## API Documentation

### POST /api/stitch-panorama

**Request:**
- Form data with 8 image files named `photos`
- Each image can be up to 50MB
- Total request: ~30 seconds to 2 minutes

**Response (Success):**
```json
{
  "success": true,
  "panoramaUrl": "http://server/panoramas/panorama_1234567890.jpg",
  "panoramaId": "panorama_1234567890"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Not enough images" or other error message
}
```

### GET /api/health

Returns server status:
```json
{
  "status": "ok",
  "service": "Panorama Stitching Server",
  "version": "1.0.0"
}
```

## Output Format

The stitched panorama is:
- **Format**: JPEG (lossy, good quality/size tradeoff)
- **Aspect ratio**: 2:1 (equirectangular/cylindrical projection)
- **Size**: 2048 x 1024px (adjust in code if needed)
- **Typical file size**: 1-5MB

This format is perfect for 360° panorama viewers that use equirectangular projection!

## Cost Estimates

| Service | Cost | Notes |
|---------|------|-------|
| Render.com | Free | 750 hrs/month free tier |
| Railway.app | Free | $5 credit included |
| Heroku | Paid | $7+/month (upgraded pricing) |
| AWS Lambda | ~$2-5/mo | Pay per invocation |

## Next Steps

1. Deploy your backend
2. Update `STITCHING_SERVER_URL` in your app
3. Test with 8 photos in 45° intervals
4. Monitor logs for any stitching issues
5. Adjust timeout/quality settings based on performance

Happy panorama stitching! 🌐📸
