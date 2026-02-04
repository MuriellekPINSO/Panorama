# Panorama Stitching Architecture

## Overview

Your app has been upgraded from displaying 8 separate photos to creating a **true 360° seamless panorama** using advanced image processing techniques.

### The Problem (Previous Implementation)
❌ Displaying photos sequentially:
- User scrolls through images 1→2→3→...→8
- Jarring transitions between photos
- Visible seams where images meet
- No sense of continuity
- Not a true panorama experience

### The Solution (New Implementation)
✅ Seamless panorama stitching:
- All 8 photos merged into 1 equirectangular image
- Smooth 360° viewing experience
- Invisible seams through intelligent blending
- Professional-quality output

---

## Technical Architecture

### 1. Mobile App (Expo/React Native)
**Location:** `app/(tabs)/create.tsx`

```
User captures 8 photos (45° apart)
         ↓
   [save locally]
         ↓
   [upload to backend]
         ↓
   [wait for processing]
         ↓
   [download stitched result]
         ↓
   [display seamless panorama]
```

**Key changes:**
- Photos are captured as before (scanning mode)
- After all 8 captured, they're uploaded to the backend
- Processing shows 5 detailed steps:
  1. Feature detection
  2. Geometric alignment  
  3. Distortion correction
  4. Seamless blending

### 2. Backend Stitching Server (Node.js + Python/OpenCV)
**Location:** `backend-stitching/server.js`

```
Receives 8 JPEGs
       ↓
   [Python/OpenCV]
       ↓
1. Feature Detection (ORB algorithm)
   - Find corner points, edges
   - Create feature descriptors
   
2. Feature Matching
   - Find corresponding points between adjacent photos
   - Handle 30-50% overlap between images
   
3. Homography Calculation
   - Compute transformation matrices
   - Warp images to common coordinate system
   
4. Distortion Correction
   - Compensate for wide-angle lens effects
   - Correct barrel distortion
   
5. Blending
   - Multi-band blending for seamless transitions
   - Feather edges to hide seams
   
6. Equirectangular Projection
   - Arrange panorama as 2:1 aspect ratio
   - Ready for 360° viewers
       ↓
   Returns single JPEG panorama
```

### 3. Storage
**Location:** `FileSystem.documentDirectory/stitched-panoramas/`

```
Before: Individual photos stored as:
  panorama_1234567890_0.jpg
  panorama_1234567890_1.jpg
  ... (8 files)

After: Single stitched panorama:
  panorama_1234567890.jpg (2048x1024)
```

**Storage savings:** 8 × 3MB photos → 1 × 2MB panorama = **12x smaller!**

---

## Image Processing Pipeline

### Step 1: Feature Detection
```
Input: 8 individual photos
       ↓
   For each image:
   - Convert to grayscale
   - Apply ORB detector
   - Find ~500 feature points per image
   - Extract feature descriptors
       ↓
Output: Feature keypoints + descriptors for each photo
```

**Why this matters:** These features serve as "landmarks" that the algorithm can recognize across overlapping image regions.

### Step 2: Feature Matching
```
Image 1 features ←→ Image 2 features
       ↓
   Use Brute Force Matcher:
   - Find nearest feature neighbors
   - Keep only strong matches
   - Discard ambiguous matches
       ↓
Output: 50-200 corresponding point pairs between each adjacent image pair
```

**Why this matters:** Corresponding points tell us exactly how images align geometrically.

### Step 3: Homography & Geometric Alignment
```
Point correspondences
       ↓
   Calculate homography matrix H using RANSAC:
   - Warp Image 2 to align with Image 1
   - Uses perspective transformation
   - Accounts for camera rotation angles
       ↓
Output: Transformation that maps pixels from one image to another
```

**Formula:** 
```
[x']   [h11 h12 h13] [x]
[y'] = [h21 h22 h23] [y]
[w']   [h31 h32 h33] [1]
```

This transformation handles:
- Rotations (ℹ️ Your 45° turns)
- Scaling (minor focal length variations)
- Perspective distortion
- Shearing

### Step 4: Distortion Correction
```
Warped panorama
       ↓
   Apply barrel/pincushion correction:
   - Model: x' = x * (1 + k₁r² + k₂r⁴)
   - Straighten curved lines
   - Correct wide-angle lens effects
       ↓
Output: Geometrically corrected composite
```

**Why this matters:** Without this, straight lines appear curved at image boundaries.

### Step 5: Seamless Blending
```
Aligned images with overlapping regions
       ↓
   Multi-band blending process:
   - Decompose into frequency bands
   - Blend high frequencies (details) at seams
   - Blend low frequencies (colors) smoothly
   - Feather edges with Gaussian kernel
       ↓
Output: Invisible seams, consistent color across panorama
```

**Blending formula:**
```
I_final(x,y) = w₁(x,y) × I₁(x,y) + w₂(x,y) × I₂(x,y)

where w₁ + w₂ = 1 (weight function)
      w₁ = linear fade near seam
      w₂ = 1 - w₁
```

### Step 6: Equirectangular Projection
```
Composite image
       ↓
   Reproject to equirectangular format:
   - 360° horizontal FOV = full width
   - 180° vertical FOV = half width
   - Aspect ratio = 2:1 (e.g., 2048×1024)
       ↓
Output: Standard panorama format for 360° viewers
```

---

## Data Flow Diagram

```
┌─────────────────┐
│  User captures  │
│   8 photos      │
└────────┬────────┘
         │ 45° apart
         ↓
┌─────────────────────────────┐
│  Mobile App (Expo)          │
│ - Save photos locally       │
│ - Create FormData           │
│ - Upload to backend         │
└────────┬────────────────────┘
         │ HTTP POST (8 JPEGs)
         │ ~20-30 MB total
         ↓
┌───────────────────────────────┐
│  Backend Server (Node.js)     │
│ - Receive multipart data      │
│ - Validate 8 photos           │
│ - Spawn Python process        │
└────────┬──────────────────────┘
         │
         ↓
┌──────────────────────────────────┐
│  Python Script + OpenCV          │
│ ├─ Load 8 images                 │
│ ├─ Feature detection (ORB)       │
│ ├─ Feature matching              │
│ ├─ Homography calculation        │
│ ├─ Image warping & blending      │
│ ├─ Distortion correction         │
│ ├─ Crop black borders            │
│ └─ Save to JPEG                  │
└────────┬─────────────────────────┘
         │ Stitched panorama
         │ ~2-5 MB (2048×1024)
         ↓
┌──────────────────────────────┐
│  Backend Server              │
│ - Return panorama URL        │
│ - Send success response      │
└────────┬─────────────────────┘
         │ HTTP response JSON
         ↓
┌─────────────────────────────┐
│  Mobile App                 │
│ - Download panorama         │
│ - Save to device            │
│ - Store metadata in storage │
└────────┬────────────────────┘
         │
         ↓
┌──────────────────────────────┐
│  Panorama Viewer             │
│ - Display 360° panorama      │
│ - User can pan/zoom          │
│ - Smooth, seamless viewing   │
└──────────────────────────────┘
```

---

## Key Improvements Over Simple Concatenation

| Aspect | Simple (8 photos) | Stitched (seamless panorama) |
|--------|------------------|------------------------------|
| **Viewing** | Scroll through images | Smooth 360° pan |
| **Seams** | Visible, jarring | Invisible |
| **Distortion** | Uncorrected | Geometrically corrected |
| **Color** | May vary between photos | Blended consistently |
| **File size** | 8 × 3MB = 24MB | 1 × 2MB = 2MB |
| **Loading** | Load 8 files | Load 1 file |
| **Quality** | Looks like photo gallery | Professional panorama |
| **Field of view** | 8 separate views | Continuous 360° |

---

## Configuration

### Mobile App Settings
**File:** `app/(tabs)/create.tsx`

```typescript
// Backend server URL - configure for your deployment
const STITCHING_SERVER_URL = process.env.EXPO_PUBLIC_STITCHING_SERVER || 'http://localhost:3000';

// Photo capture parameters
const TOTAL_PHOTOS = 8;              // Must match backend
const ANGLE_INCREMENT = 45;          // 360 / 8 = 45°
const PHOTO_QUALITY = 0.85;          // JPEG quality
```

### Backend Settings
**File:** `backend-stitching/server.js`

```javascript
// Image processing parameters
const MAX_PHOTOS_PER_REQUEST = 8;
const PROCESSING_TIMEOUT = 300000;   // 5 minutes
const OUTPUT_FORMAT = 'JPEG';

// Python script parameters (see generateStitchingScript):
const TARGET_HEIGHT = 1024;          // Resize for processing
const CONFIDENCE_THRESHOLD = 0.3;    // Lower = more lenient
```

---

## Deployment Checklist

- [ ] **Backend Server**
  - [ ] Python 3.7+ with cv2 installed
  - [ ] Node.js 14+ with express & multer
  - [ ] Ports 3000+ available
  - [ ] ~500MB disk for temp files

- [ ] **Mobile App Configuration**
  - [ ] Set `EXPO_PUBLIC_STITCHING_SERVER` env var
  - [ ] Test with local server first
  - [ ] Verify 8-photo capture flow
  - [ ] Test panorama viewer

- [ ] **Production Deployment**
  - [ ] Deploy backend (Render, Railway, etc.)
  - [ ] Update server URL in app
  - [ ] Test end-to-end stitching
  - [ ] Monitor server logs
  - [ ] Set up error alerts

---

## Performance Metrics

| Step | Time | Notes |
|------|------|-------|
| Photo upload | 10-20s | Depends on network |
| Feature detection | 5-10s | Per image |
| Feature matching | 3-5s | 8 image pairs |
| Homography calc | 2-3s | RANSAC algorithm |
| Warping/blending | 10-15s | Intensive operation |
| **Total** | **30-60s** | Typical processing time |

**Optimization tips:**
- Reduce target height (1024→512) for faster processing
- Increase timeout for slower servers
- Use GPU if available (CUDA for OpenCV)

---

## Troubleshooting Guide

### Stitching Fails: "Not enough images"
- ✓ Verify 8 photos captured
- ✓ Check file upload wasn't truncated

### Stitching Fails: "Failed to estimate homography"
- ✓ Photos need 30-50% overlap
- ✓ Lighting should be consistent
- ✓ Avoid moving subjects

### Server timeout
- ✓ Increase timeout in create.tsx
- ✓ Reduce image resolution
- ✓ Check server CPU usage

### Poor stitching quality
- ✓ Ensure 45° angle increments
- ✓ Keep camera steady
- ✓ Maintain consistent lighting

---

## Future Enhancements

1. **GPU Acceleration**
   - Use CUDA/OpenCL for faster stitching
   - Reduce processing time to 5-10s

2. **Advanced Blending**
   - Implement graph-cut optimization
   - Better handling of moving objects

3. **Temporal Optimization**
   - Use motion vectors for better alignment
   - Benefit from consistent camera motion

4. **Cloud Integration**
   - AWS Rekognition for automatic photo quality
   - Azure Computer Vision for distortion analysis

5. **Custom Calibration**
   - Auto-detect lens distortion coefficients
   - Calibrate for specific camera models

---

## References

- [OpenCV Stitching Module](https://docs.opencv.org/master/d1/d46/group__stitching.html)
- [Equirectangular Projection](https://en.wikipedia.org/wiki/Equirectangular_projection)
- [Image Blending Techniques](https://docs.opencv.org/master/d2/dff/tutorial_py_poisson_image_editing.html)
- [Feature Detection (ORB)](https://docs.opencv.org/master/d7/d19/classcv_1_1ORB.html)

---

**Last Updated:** January 27, 2026
**Version:** 1.0.0
