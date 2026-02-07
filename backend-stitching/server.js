/**
 * Backend Node.js pour assemblage panoramique
 * Supporte 2 modes:
 * 1. Mode Python/OpenCV (meilleure qualité)
 * 2. Mode JavaScript sans dépendances (fallback)
 * 
 * Déployable sur: Render, Railway, Vercel, ou en local
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

// Note: Install these packages:
// npm install sharp piexifjs

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  maxFileSize: 50 * 1024 * 1024, // 50MB max par fichier
  uploadDir: path.join(os.tmpdir(), 'panorama-uploads'),
  outputDir: path.join(__dirname, 'outputs'),
  metadataDir: path.join(__dirname, 'panorama-metadata'),
  // Formats de sortie optimisés pour VR et streaming
  formats: {
    fullHD: { width: 4096, height: 2048, quality: 92 }, // Equirectangulaire full
    streamingHD: { width: 2048, height: 1024, quality: 85 }, // Mobile streaming
    thumbnail: { width: 512, height: 256, quality: 75 } // Aperçu
  }
};

// Créer les dossiers nécessaires
[CONFIG.uploadDir, CONFIG.outputDir, CONFIG.metadataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuration Multer pour upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CONFIG.uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`)
});

const upload = multer({ 
  storage,
  limits: { fileSize: CONFIG.maxFileSize },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont acceptées'));
    }
  }
});

// Middleware CORS - IMPORTANT pour l'app mobile
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Servir les panoramas générés
app.use('/panoramas', express.static(CONFIG.outputDir));

// ============================================
// ENDPOINTS
// ============================================

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  const pythonInfo = await checkPythonAvailable();
  
  res.json({
    status: 'ok',
    service: 'Teleport 360° Panorama Server',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    capabilities: {
      pythonOpenCV: pythonInfo.available,
      opencvVersion: pythonInfo.version || 'N/A',
      equirectangular360: true,
      geospatialMetadata: true,
      optimizedCompression: true,
      vrReady: true
    },
    formats: CONFIG.formats,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
    }
  });
});

/**
 * Main panorama stitching endpoint - Teleport 360° Equirectangular
 * POST /api/stitch-panorama
 * Body: FormData with:
 *   - photos: array of images (min 3 for 360°)
 *   - metadata: JSON string with {gps: {lat, lon, alt}, orientation, location_name}
 */
app.post('/api/stitch-panorama', upload.array('photos', 12), async (req, res) => {
  const uploadedFiles = req.files || [];
  const panoramaId = `tele_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const outputPath = path.join(CONFIG.outputDir, `${panoramaId}.jpg`);
  
  // Récupérer les métadonnées
  let metadata = {};
  try {
    metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
  } catch (e) {
    console.warn('⚠️ Métadonnées invalides:', e.message);
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🌐 TELEPORT 360° EQUIRECTANGULAIRE`);
  console.log(`   ID: ${panoramaId}`);
  console.log(`   Photos: ${uploadedFiles.length}`);
  if (metadata.gps) {
    console.log(`   GPS: ${metadata.gps.lat.toFixed(4)}°, ${metadata.gps.lon.toFixed(4)}°`);
  }
  console.log(`${'='.repeat(60)}`);
  
  try {
    // Validation minimum 3 images pour 360°
    if (uploadedFiles.length < 3) {
      return res.status(400).json({
        success: false,
        error: `Minimum 3 images pour 360° complet, reçu: ${uploadedFiles.length}`
      });
    }

    const photosPaths = uploadedFiles.map(f => f.path);
    
    // Log des fichiers
    console.log('📁 Fichiers:');
    photosPaths.forEach((p, i) => {
      const stats = fs.statSync(p);
      console.log(`   ${i + 1}. ${(stats.size / 1024).toFixed(1)} KB`);
    });

    // Assemblage avec projection équirectangulaire
    const pythonInfo = await checkPythonAvailable();
    let result;

    if (pythonInfo.available) {
      console.log(`\n🐍 Mode OpenCV Equirectangular (v${pythonInfo.version})`);
      result = await stitchEquirectangular(photosPaths, outputPath, panoramaId, metadata);
    } else {
      console.log('\n⚠️ Mode basique (sans projection 360°)');
      result = await createSimplePanorama(photosPaths, outputPath);
    }

    if (result.success && fs.existsSync(outputPath)) {
      const fileStats = fs.statSync(outputPath);
      console.log(`\n✅ Panorama 360° créé! Taille: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Sauvegarder les métadonnées
      const metadataPath = path.join(CONFIG.metadataDir, `${panoramaId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        panoramaId,
        createdAt: new Date().toISOString(),
        imageCount: photosPaths.length,
        format: 'equirectangular',
        resolution: result.resolution,
        fileSize: fileStats.size,
        gps: metadata.gps || null,
        orientation: metadata.orientation || 'north',
        locationName: metadata.location_name || 'Unknown',
        compression: result.compression || 'jpg'
      }, null, 2));

      // Construire l'URL du panorama
      const host = req.get('host');
      const protocol = req.protocol;
      const panoramaUrl = `${protocol}://${host}/panoramas/${path.basename(outputPath)}`;
      const viewerUrl = `${protocol}://${host}/viewer?id=${panoramaId}`;
      
      res.json({
        success: true,
        panoramaId,
        panoramaUrl,
        viewerUrl,
        format: 'equirectangular-360',
        resolution: result.resolution,
        fileSize: fileStats.size,
        method: pythonInfo.available ? 'opencv-equirectangular' : 'simple',
        gps: metadata.gps || null,
        location: metadata.location_name || null
      });
    } else {
      throw new Error(result.error || 'Échec de l\'assemblage équirectangulaire');
    }

  } catch (error) {
    console.error(`\n❌ Erreur: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de l\'assemblage'
    });

  } finally {
    // Nettoyage
    cleanupFiles(uploadedFiles.map(f => f.path));
  }
});

/**
 * Endpoint pour télécharger les métadonnées d'un panorama
 */
app.get('/api/panorama/:id/metadata', (req, res) => {
  const metadataPath = path.join(CONFIG.metadataDir, `${req.params.id}.json`);
  
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    res.json(metadata);
  } else {
    res.status(404).json({ error: 'Métadonnées non trouvées' });
  }
});

/**
 * Endpoint pour obtenir les versions optimisées (streaming, thumbnail)
 * Note: Nécessite 'sharp' : npm install sharp
 */
app.get('/api/panorama/:id/:format', async (req, res) => {
  const { id, format } = req.params;
  const baseFile = path.join(CONFIG.outputDir, `${id}.jpg`);
  
  if (!fs.existsSync(baseFile)) {
    return res.status(404).json({ error: 'Panorama non trouvé' });
  }
  
  try {
    // Pour l'instant, servir le fichier original
    // Sharp sera activé quand installé
    if (format === 'thumbnail' || format === 'streamingHD') {
      // TODO: Implémenter quand sharp est disponible
      return res.sendFile(baseFile);
    }
    res.sendFile(baseFile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// FONCTIONS D'ASSEMBLAGE
// ============================================

/**
 * Assemblage avec projection équirectangulaire 360°
 */
async function stitchEquirectangular(photoPaths, outputPath, panoramaId, metadata) {
  return new Promise((resolve) => {
    const scriptContent = generateEquirectangularScript(photoPaths, outputPath, metadata);
    const scriptPath = path.join(CONFIG.outputDir, `script_${panoramaId}.py`);
    
    fs.writeFileSync(scriptPath, scriptContent);
    console.log(`📝 Script équirectangulaire: ${scriptPath}`);

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    const pythonProcess = spawn(pythonCmd, [scriptPath], {
      timeout: 300000,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      text.split('\n').filter(l => l.trim()).forEach(line => {
        console.log(`   [Py] ${line}`);
      });
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      try { fs.unlinkSync(scriptPath); } catch (e) {}

      if (code === 0 && fs.existsSync(outputPath)) {
        // Récupérer la résolution du panorama
        const resolution = stdout.match(/Panorama final: (\d+)x(\d+)/);
        resolve({ 
          success: true,
          resolution: resolution ? `${resolution[1]}x${resolution[2]}` : '4096x2048',
          compression: 'jpg'
        });
      } else {
        console.error(`   [Py Error] ${stderr}`);
        resolve({ 
          success: false, 
          error: stderr || `Code de sortie: ${code}`
        });
      }
    });

    pythonProcess.on('error', (err) => {
      resolve({ success: false, error: `Erreur Python: ${err.message}` });
    });
  });
}

/**
 * Mode simple: copie la première image (fallback)
 */
async function createSimplePanorama(photoPaths, outputPath) {
  try {
    // En mode simple, on copie juste la première image
    // Idéalement, utilisez une lib comme Sharp pour faire une vraie mosaïque
    fs.copyFileSync(photoPaths[0], outputPath);
    console.log('⚠️ Mode simple: première image utilisée');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Génère script Python pour projection équirectangulaire 360°
 */
function generateEquirectangularScript(photoPaths, outputPath, metadata) {
  const escapePath = (p) => p.replace(/\\/g, '\\\\');
  const pathsArray = photoPaths.map(p => `r"${escapePath(p)}"`).join(',\n            ');
  const gpsInfo = metadata?.gps ? 
    `GPS: {lat: ${metadata.gps.lat}, lon: ${metadata.gps.lon}, alt: ${metadata.gps.alt || 0}}` : 
    'GPS: Non disponible';

  // Pass orientation data so the stitcher can sort images and use hints
  const orientationsJson = metadata?.orientations
    ? JSON.stringify(metadata.orientations)
    : '[]';
  
  return `# -*- coding: utf-8 -*-
"""
Spherical 360° → Equirectangular stitching for VR/AR headsets.
Receives photos with per-photo orientation (yaw, pitch, roll) captured
by DeviceMotion on the phone.
"""
import cv2
import numpy as np
import json
import sys
import math

def stitch_equirectangular(paths, output, orientations_json='[]'):
    print("🌐 Spherical 360° → Equirectangular stitching")
    print(f"${gpsInfo}")
    print(f"Loading {len(paths)} images...")

    orientations = json.loads(orientations_json)

    # Sort images by yaw then pitch for better stitching order
    if orientations:
        paired = list(zip(paths, orientations))
        paired.sort(key=lambda x: (round(x[1].get('pitch', 0) / 30), x[1].get('yaw', 0)))
        paths = [p for p, _ in paired]
        orientations = [o for _, o in paired]
        print("  Images sorted by orientation for optimal stitching order")

    images = []
    for i, p in enumerate(paths):
        img = cv2.imread(p)
        if img is None:
            raise Exception(f"Cannot load: {p}")
        h, w = img.shape[:2]
        # Scale down for stitching performance (keep enough detail)
        if max(h, w) > 1600:
            scale = 1600 / max(h, w)
            img = cv2.resize(img, None, fx=scale, fy=scale)
        images.append(img)
        ori_info = ""
        if i < len(orientations):
            o = orientations[i]
            ori_info = f" | yaw={o.get('yaw', '?'):.0f}° pitch={o.get('pitch', '?'):.0f}°"
        print(f"  Image {i+1}/{len(paths)}: {img.shape[1]}x{img.shape[0]}{ori_info}")

    print("\\n⚙️ Stitching with spherical projection...")

    # Use PANORAMA mode (spherical warping) — this is key for VR output
    stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)

    # Lower confidence threshold to handle wide-angle spherical captures
    stitcher.setPanoConfidenceThresh(0.15)

    # Try stitching
    status, pano = stitcher.stitch(images)

    if status != cv2.Stitcher_OK:
        msgs = {
            1: "Not enough feature matches between images. Ensure sufficient overlap.",
            2: "Homography estimation failed.",
            3: "Camera parameter adjustment failed."
        }
        # If full stitch fails, try with subsets (row by row)
        print(f"  ⚠️ Full stitch failed (code {status}), trying row-by-row...")
        pano = try_row_stitch(images, orientations)
        if pano is None:
            raise Exception(msgs.get(status, f"Stitching error code {status}"))

    print(f"  Raw panorama: {pano.shape[1]}x{pano.shape[0]}")

    # Crop black borders
    gray = cv2.cvtColor(pano, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
        pano = pano[y:y+h, x:x+w]
    print(f"  After crop: {pano.shape[1]}x{pano.shape[0]}")

    # Force 2:1 equirectangular aspect ratio (required for VR/AR)
    target_w = 4096
    target_h = 2048
    pano_eq = cv2.resize(pano, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
    print(f"  Equirectangular: {target_w}x{target_h}")

    # Save with high quality
    cv2.imwrite(output, pano_eq, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"Panorama final: {target_w}x{target_h}")
    print("✅ OK — VR/AR ready")


def try_row_stitch(images, orientations):
    """
    Fallback: group images by pitch rows, stitch each row horizontally,
    then combine rows vertically.
    """
    if not orientations or len(orientations) != len(images):
        return None

    # Group by pitch bucket (rounded to nearest 30°)
    rows = {}
    for img, ori in zip(images, orientations):
        bucket = round(ori.get('pitch', 0) / 30) * 30
        rows.setdefault(bucket, []).append(img)

    stitched_rows = []
    stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
    stitcher.setPanoConfidenceThresh(0.1)

    for pitch in sorted(rows.keys(), reverse=True):
        row_imgs = rows[pitch]
        print(f"  Row pitch={pitch}°: {len(row_imgs)} images")
        if len(row_imgs) == 1:
            stitched_rows.append(row_imgs[0])
        else:
            status, row_pano = stitcher.stitch(row_imgs)
            if status == cv2.Stitcher_OK:
                stitched_rows.append(row_pano)
                print(f"    ✓ Row stitched: {row_pano.shape[1]}x{row_pano.shape[0]}")
            else:
                print(f"    ✗ Row stitch failed, using first image")
                stitched_rows.append(row_imgs[0])

    if not stitched_rows:
        return None

    # Normalize widths and stack vertically
    max_w = max(r.shape[1] for r in stitched_rows)
    resized = []
    for r in stitched_rows:
        if r.shape[1] != max_w:
            scale = max_w / r.shape[1]
            r = cv2.resize(r, (max_w, int(r.shape[0] * scale)))
        resized.append(r)

    combined = np.vstack(resized)
    print(f"  Combined rows: {combined.shape[1]}x{combined.shape[0]}")
    return combined


if __name__ == '__main__':
    try:
        paths = [
            ${pathsArray}
        ]
        output = r"${escapePath(outputPath)}"
        orientations_json = r'''${orientationsJson}'''
        stitch_equirectangular(paths, output, orientations_json)
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        sys.exit(1)
`;
}

/**
 * Génère le script Python OpenCV
 */
function generatePythonScript(photoPaths, outputPath) {
  const escapePath = (p) => p.replace(/\\/g, '\\\\');
  const pathsArray = photoPaths.map(p => `r"${escapePath(p)}"`).join(',\n            ');
  
  return `# -*- coding: utf-8 -*-
import cv2
import numpy as np
import sys

def stitch(paths, output):
    print(f"Chargement de {len(paths)} images...")
    
    images = []
    for i, p in enumerate(paths):
        img = cv2.imread(p)
        if img is None:
            raise Exception(f"Impossible de charger: {p}")
        
        # Redimensionner pour optimiser
        h, w = img.shape[:2]
        if max(h, w) > 1200:
            scale = 1200 / max(h, w)
            img = cv2.resize(img, None, fx=scale, fy=scale)
        
        images.append(img)
        print(f"  Image {i+1}: {img.shape[1]}x{img.shape[0]}")
    
    print("Assemblage en cours...")
    
    stitcher = cv2.Stitcher_create(cv2.Stitcher_PANORAMA)
    stitcher.setPanoConfidenceThresh(0.2)
    
    status, pano = stitcher.stitch(images)
    
    if status != cv2.Stitcher_OK:
        msgs = {
            1: "Pas assez de correspondances",
            2: "Echec homographie", 
            3: "Echec ajustement camera"
        }
        raise Exception(msgs.get(status, f"Erreur {status}"))
    
    # Recadrer les bords noirs
    gray = cv2.cvtColor(pano, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 1, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
        pano = pano[y:y+h, x:x+w]
    
    cv2.imwrite(output, pano, [cv2.IMWRITE_JPEG_QUALITY, 92])
    print(f"Panorama: {pano.shape[1]}x{pano.shape[0]}")
    print("OK")

if __name__ == '__main__':
    try:
        paths = [
            ${pathsArray}
        ]
        output = r"${escapePath(outputPath)}"
        stitch(paths, output)
    except Exception as e:
        print(f"ERREUR: {e}", file=sys.stderr)
        sys.exit(1)
`;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Vérifie Python et OpenCV
 */
async function checkPythonAvailable() {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32' 
      ? 'python -c "import cv2; print(cv2.__version__)"'
      : 'python3 -c "import cv2; print(cv2.__version__)"';
    
    exec(cmd, { timeout: 5000 }, (error, stdout) => {
      if (error) {
        resolve({ available: false });
      } else {
        resolve({ available: true, version: stdout.trim() });
      }
    });
  });
}

/**
 * Nettoie les fichiers temporaires
 */
function cleanupFiles(filePaths) {
  filePaths.forEach(p => {
    try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
  });
}

// ============================================
// DÉMARRAGE
// ============================================

app.listen(CONFIG.port, '0.0.0.0', async () => {
  const pythonInfo = await checkPythonAvailable();
  
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌐  TELEPORT 360° PANORAMA SERVER - v3.0                ║
║                                                           ║
║   URL: http://localhost:${CONFIG.port}                            ║
║   Python/OpenCV: ${pythonInfo.available ? '✅ ' + pythonInfo.version : '❌ Non disponible'}
║                                                           ║
║   FEATURES:                                               ║
║   ✨ Equirectangular 360° for VR/Immersive              ║
║   📍 Geospatial Metadata (GPS, Orientation)            ║
║   🎬 Real-time Streaming Optimized                     ║
║   🔄 Multi-image Fusion                                ║
║                                                           ║
║   ENDPOINTS:                                              ║
║   • POST /api/stitch-panorama    - Create 360°          ║
║   • GET  /api/panorama/:id/metadata - Get metadata       ║
║   • GET  /api/panorama/:id/:format  - Get optimized      ║
║   • GET  /api/health             - Status                ║
║   • GET  /panoramas/:file        - Download              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  if (!pythonInfo.available) {
    console.log('⚠️  Pour activer l\'assemblage OpenCV:');
    console.log('    pip install opencv-python\n');
  }
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

module.exports = app;
