/**
 * Backend Node.js pour assemblage panoramique avec OpenCV
 * Déployable gratuitement sur Render, Railway ou Heroku
 */

const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Installer d'abord: npm install express multer

app.post('/api/stitch-panorama', upload.array('photos', 8), async (req, res) => {
  try {
    const photosPaths = req.files.map(f => path.resolve(f.path));
    const outputPath = path.resolve(`outputs/panorama_${Date.now()}.jpg`);
    
    // Créer le dossier output
    if (!fs.existsSync('outputs')) {
      fs.mkdirSync('outputs');
    }
    
    // Utiliser Python avec OpenCV pour le stitching
    const pythonScript = `
import cv2
import sys

# Charger les images
images = [cv2.imread(path) for path in sys.argv[1:-1]]

# Créer le stitcher
stitcher = cv2.Stitcher_create()

# Assembler
status, panorama = stitcher.stitch(images)

if status == cv2.Stitcher_OK:
    cv2.imwrite(sys.argv[-1], panorama)
    print("SUCCESS")
else:
    print(f"ERROR: {status}")
    sys.exit(1)
`;
    
    // Sauvegarder le script Python temporaire
    const scriptPath = 'stitch.py';
    fs.writeFileSync(scriptPath, pythonScript);
    
    // Exécuter le script Python
    const python = spawn('python3', [scriptPath, ...photosPaths, outputPath]);
    
    python.stdout.on('data', (data) => {
      console.log(`Python: ${data}`);
    });
    
    python.stderr.on('data', (data) => {
      console.error(`Erreur: ${data}`);
    });
    
    python.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        // Succès - retourner l'URL
        res.json({
          success: true,
          panoramaUrl: `${req.protocol}://${req.get('host')}/panoramas/${path.basename(outputPath)}`
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Échec de l\'assemblage'
        });
      }
      
      // Nettoyer les fichiers temporaires
      req.files.forEach(f => fs.unlinkSync(f.path));
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Servir les panoramas générés
app.use('/panoramas', express.static('outputs'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur de stitching lancé sur le port ${PORT}`);
});

// Pour déployer sur Render.com (gratuit) :
// 1. Créez un compte sur render.com
// 2. Nouveau "Web Service"
// 3. Connectez votre repo GitHub
// 4. Build Command: npm install && pip install opencv-python
// 5. Start Command: node server.js
