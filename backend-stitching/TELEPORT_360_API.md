# 🌐 Teleport 360° Panorama Server - v3.0

## Architecture Overview

Le serveur supporte la création de **panoramas équirectangulaires 360°** optimisés pour l'immersion virtuelle, inspired by Teleport.

### Features Principales

✨ **Equirectangular 360° Projection** - Images VR natives (4096x2048)
📍 **Geospatial Metadata** - GPS, altitude, orientation stockés
🎬 **Streaming Optimized** - Compression progressive pour mobile
🔄 **Multi-Image Fusion** - Assemblage intelligent de 3+ images
⚡ **Real-time Processing** - Traitement rapide avec OpenCV

---

## API Endpoints

### 1. Créer un Panorama 360°

**POST** `/api/stitch-panorama`

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Request Body:**
```javascript
FormData {
  photos: [File, File, File, ...],  // Min 3 images JPG/PNG
  metadata: JSON.stringify({         // OPTIONAL
    gps: {
      lat: 48.8566,
      lon: 2.3522,
      alt: 35
    },
    orientation: "north",             // north|south|east|west
    location_name: "Paris, France"
  })
}
```

**Success Response (200):**
```json
{
  "success": true,
  "panoramaId": "tele_1707123456789_abc123",
  "panoramaUrl": "http://localhost:3000/panoramas/tele_1707123456789_abc123.jpg",
  "viewerUrl": "http://localhost:3000/viewer?id=tele_1707123456789_abc123",
  "format": "equirectangular-360",
  "resolution": "4096x2048",
  "fileSize": 2457600,
  "method": "opencv-equirectangular",
  "gps": {
    "lat": 48.8566,
    "lon": 2.3522,
    "alt": 35
  },
  "location": "Paris, France"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "Minimum 3 images pour 360° complet, reçu: 2"
}
```

---

### 2. Récupérer les Métadonnées

**GET** `/api/panorama/:id/metadata`

**Response (200):**
```json
{
  "panoramaId": "tele_1707123456789_abc123",
  "createdAt": "2026-02-03T10:30:45.123Z",
  "imageCount": 3,
  "format": "equirectangular",
  "resolution": "4096x2048",
  "fileSize": 2457600,
  "gps": {
    "lat": 48.8566,
    "lon": 2.3522,
    "alt": 35
  },
  "orientation": "north",
  "locationName": "Paris, France",
  "compression": "jpg"
}
```

---

### 3. Obtenir Versions Optimisées

**GET** `/api/panorama/:id/:format`

**Formats disponibles:**
- `fullHD` - 4096x2048 @ 92% quality (full VR)
- `streamingHD` - 2048x1024 @ 85% quality (mobile)
- `thumbnail` - 512x256 @ 75% quality (preview)

**Response:**
```
Image JPEG binary stream
```

---

### 4. Health Check

**GET** `/api/health`

**Response:**
```json
{
  "status": "ok",
  "service": "Teleport 360° Panorama Server",
  "version": "3.0.0",
  "timestamp": "2026-02-03T10:30:45.123Z",
  "capabilities": {
    "pythonOpenCV": true,
    "opencvVersion": "4.8.0",
    "equirectangular360": true,
    "geospatialMetadata": true,
    "optimizedCompression": true,
    "vrReady": true
  },
  "formats": {
    "fullHD": {"width": 4096, "height": 2048, "quality": 92},
    "streamingHD": {"width": 2048, "height": 1024, "quality": 85},
    "thumbnail": {"width": 512, "height": 256, "quality": 75}
  }
}
```

---

## Installation & Setup

### Prerequisites

```bash
# Node.js (v14+)
node --version

# Python (v3.7+)
python --version

# OpenCV
pip install opencv-python numpy
```

### Installation

```bash
cd backend-stitching
npm install

# Optional: for advanced compression
npm install sharp piexifjs
```

### Start Server

```bash
npm start
# or
node server.js
```

Server runs on `http://localhost:3000`

---

## Usage Examples

### JavaScript/Node.js Client

```javascript
const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

const form = new FormData();

// Add 3+ images
form.append('photos', fs.createReadStream('photo1.jpg'));
form.append('photos', fs.createReadStream('photo2.jpg'));
form.append('photos', fs.createReadStream('photo3.jpg'));

// Add GPS metadata
form.append('metadata', JSON.stringify({
  gps: { lat: 48.8566, lon: 2.3522, alt: 35 },
  location_name: 'Eiffel Tower, Paris'
}));

// Send
http.request('http://localhost:3000/api/stitch-panorama', {
  method: 'POST',
  headers: form.getHeaders()
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data)));
}).on('error', console.error).end(form);
```

### cURL Command

```bash
curl -X POST http://localhost:3000/api/stitch-panorama \
  -F "photos=@photo1.jpg" \
  -F "photos=@photo2.jpg" \
  -F "photos=@photo3.jpg" \
  -F 'metadata={"gps":{"lat":48.8566,"lon":2.3522,"alt":35},"location_name":"Paris"}' \
  | jq .
```

### Using Client Script

```bash
# Basic usage
node client-example.js photo1.jpg photo2.jpg photo3.jpg

# With GPS metadata
node client-example.js photo1.jpg photo2.jpg photo3.jpg \
  --lat 48.8566 --lon 2.3522 --alt 35 \
  --location "Eiffel Tower, Paris"
```

---

## Technical Details

### Equirectangular Projection

The server creates **2:1 aspect ratio panoramas** (4096x2048):

- **Horizontal FOV**: 360° (full rotation)
- **Vertical FOV**: 180° (full up/down)
- **Format**: Equirectangular (standard for VR/360 viewers)

### Image Processing Pipeline

```
Input Images (3+)
    ↓
Image Loading & Validation
    ↓
OpenCV Stitching
    ↓
Equirectangular Projection
    ↓
Crop Black Borders
    ↓
Resize to 4096x2048
    ↓
JPEG Compression (92% quality)
    ↓
Output Panorama
```

### Compression Strategy

| Format | Resolution | Quality | Use Case | File Size |
|--------|-----------|---------|----------|-----------|
| fullHD | 4096x2048 | 92% | VR/Desktop | 2-4 MB |
| streamingHD | 2048x1024 | 85% | Mobile preview | 600-900 KB |
| thumbnail | 512x256 | 75% | Gallery preview | 30-50 KB |

---

## Mobile Integration (React Native/Expo)

### Sending Panorama from Mobile

```javascript
import * as ImagePicker from 'expo-image-picker';
import FormData from 'form-data';

export async function createPanorama(gps) {
  // Pick 3+ images
  const images = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultiple: true,
    quality: 0.9,
  });

  const form = new FormData();
  
  images.selected.forEach((image) => {
    form.append('photos', {
      uri: image.uri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    });
  });

  form.append('metadata', JSON.stringify({
    gps: {
      lat: gps.latitude,
      lon: gps.longitude,
      alt: gps.altitude
    },
    location_name: gps.address,
    orientation: getDeviceOrientation()
  }));

  const response = await fetch('https://your-server.com/api/stitch-panorama', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return await response.json();
}
```

### Displaying Panorama

```javascript
import { WebView } from 'react-native-webview';

export function PanoramaViewer({ panoramaUrl, panoramaId }) {
  return (
    <WebView
      source={{ uri: `https://your-server.com/viewer?id=${panoramaId}` }}
      style={{ flex: 1 }}
      javaScriptEnabled={true}
    />
  );
}
```

---

## Viewer Integration (Three.js/Babylon.js)

### HTML Viewer Template

```html
<!DOCTYPE html>
<html>
<head>
  <title>Teleport 360° Viewer</title>
  <style>
    body { margin: 0; overflow: hidden; background: #000; }
    canvas { width: 100%; height: 100%; }
    #info { position: absolute; top: 20px; left: 20px; color: #fff; z-index: 10; }
  </style>
</head>
<body>
  <div id="info">
    <h2>Teleport 360°</h2>
    <p id="location"></p>
    <p id="coords"></p>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/three@r128/build/three.min.js"></script>
  <script>
    const params = new URLSearchParams(location.search);
    const panoramaId = params.get('id');

    // Fetch metadata
    fetch(`/api/panorama/${panoramaId}/metadata`)
      .then(r => r.json())
      .then(meta => {
        document.getElementById('location').textContent = meta.locationName;
        document.getElementById('coords').textContent = 
          `${meta.gps.lat.toFixed(4)}° ${meta.gps.lon.toFixed(4)}°`;
      });

    // Create Three.js scene with equirectangular texture
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Load equirectangular panorama
    new THREE.TextureLoader().load(`/panoramas/${panoramaId}.jpg`, (texture) => {
      const geometry = new THREE.SphereGeometry(500, 60, 40);
      const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Render
      renderer.render(scene, camera);
    });

    // Handle resize
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>
```

---

## Performance Optimization

### Server-side

- Images redimensionnées à 1200px avant stitching
- JPEG quality: 92% (balances quality/size)
- Temporal cleanup: fichiers temporaires supprimés après traitement

### Client-side

- Progressive image loading (thumbnail → full resolution)
- WebP support (when sharp is available)
- Lazy loading for metadata

### Network

- Chunked uploads for large files
- Range request support for streaming
- Gzip compression enabled

---

## Troubleshooting

### "Minimum 3 images pour 360° complet"

**Solution**: Upload au moins 3 images. Pour panorama 360° complet:
- 4-6 images: Couverture bonne
- 6-8 images: Couverture excellente
- 8+: Redondance excessive

### "Pas assez de correspondances"

**Solution**: 
- Prenez des images avec chevauchement (30-50%)
- Éclairage uniforme
- Évitez les scènes sans features (ciel plat, murs blancs)

### Python/OpenCV not available

**Solution**:
```bash
pip install opencv-python-headless  # For servers
# or
pip install opencv-python            # For local machines
```

### Out of Memory

**Solution**:
- Réduire la résolution d'entrée
- Traiter moins d'images
- Augmenter la RAM du serveur

---

## Deployment

### Heroku

```bash
git push heroku main
# or use container
heroku container:push web
heroku container:release web
```

### Railway/Render

```bash
# Add buildpack for Python
echo "web: npm start" > Procfile

# Deploy
git push origin main
```

### Docker

```dockerfile
FROM node:18-bullseye

# Install Python + OpenCV
RUN apt-get update && apt-get install -y python3-opencv
RUN pip install opencv-python numpy

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Future Enhancements

- [ ] WebP output support
- [ ] AVIF codec support
- [ ] Real-time streaming (HLS/DASH)
- [ ] AI upscaling
- [ ] Automatic feature detection
- [ ] Multi-format output
- [ ] Batch processing API

---

## License & Support

Teleport 360° Server - v3.0
Built for immersive virtual exploration.

For issues: Check `backend-stitching/outputs/` for logs.
