#!/usr/bin/env node

/**
 * Client Teleport 360° - Exemple d'envoi de panorama avec métadonnées
 * 
 * Usage:
 *   node client-example.js photo1.jpg photo2.jpg photo3.jpg
 * 
 * Ou avec métadonnées GPS:
 *   node client-example.js photo1.jpg photo2.jpg photo3.jpg \
 *     --lat 48.8566 --lon 2.3522 --alt 35 --location "Paris, France"
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Configuration
const API_URL = 'http://localhost:3000/api/stitch-panorama';

// Parser les arguments
const args = process.argv.slice(2);
const imagePaths = [];
const metadata = {
  gps: { lat: 0, lon: 0, alt: 0 },
  orientation: 'north',
  location_name: 'Unknown'
};

// Récupérer les images et métadonnées
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].substring(2);
    const value = args[i + 1];
    
    if (key === 'lat') metadata.gps.lat = parseFloat(value);
    if (key === 'lon') metadata.gps.lon = parseFloat(value);
    if (key === 'alt') metadata.gps.alt = parseFloat(value);
    if (key === 'location') metadata.location_name = value;
    if (key === 'orientation') metadata.orientation = value;
    
    i++; // Skip next arg (value)
  } else {
    imagePaths.push(args[i]);
  }
}

if (imagePaths.length < 3) {
  console.error('❌ Erreur: Minimum 3 images requises');
  console.error('\nUsage:');
  console.error('  node client-example.js img1.jpg img2.jpg img3.jpg [options]');
  console.error('\nOptions:');
  console.error('  --lat NUM          Latitude GPS');
  console.error('  --lon NUM          Longitude GPS');
  console.error('  --alt NUM          Altitude en mètres');
  console.error('  --location STRING  Nom du lieu');
  console.error('  --orientation STR  Orientation (north, south, east, west)');
  process.exit(1);
}

// Créer le FormData
const form = new FormData();

// Ajouter les images
imagePaths.forEach((imagePath, index) => {
  const fullPath = path.resolve(imagePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Fichier non trouvé: ${fullPath}`);
    process.exit(1);
  }
  
  const stats = fs.statSync(fullPath);
  console.log(`📸 Image ${index + 1}: ${path.basename(imagePath)} (${(stats.size / 1024).toFixed(1)} KB)`);
  form.append('photos', fs.createReadStream(fullPath), path.basename(imagePath));
});

// Ajouter les métadonnées
form.append('metadata', JSON.stringify(metadata));

// Afficher les métadonnées
console.log('\n📍 Métadonnées:');
console.log(`   GPS: ${metadata.gps.lat}°, ${metadata.gps.lon}° (alt: ${metadata.gps.alt}m)`);
console.log(`   Lieu: ${metadata.location_name}`);
console.log(`   Orientation: ${metadata.orientation}`);

// Envoyer
console.log(`\n⏳ Envoi vers ${API_URL}...`);

const req = http.request(API_URL, {
  method: 'POST',
  headers: form.getHeaders()
}, (res) => {
  let data = '';
  
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`\n Status: ${res.statusCode}`);
    
    try {
      const response = JSON.parse(data);
      
      if (response.success) {
        console.log('\n✅ Succès!');
        console.log(`📦 ID: ${response.panoramaId}`);
        console.log(`📊 Format: ${response.format}`);
        console.log(`📐 Résolution: ${response.resolution}`);
        console.log(`💾 Taille: ${(response.fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`\n🌐 Panorama URL:`);
        console.log(`   ${response.panoramaUrl}`);
        console.log(`\n👁️ Viewer URL:`);
        console.log(`   ${response.viewerUrl}`);
        console.log(`\n📍 Métadonnées URL:`);
        console.log(`   ${API_URL.replace('/stitch-panorama', '')}/panorama/${response.panoramaId}/metadata`);
      } else {
        console.log('\n❌ Erreur:');
        console.log(`   ${response.error}`);
      }
    } catch (e) {
      console.log('\n❌ Erreur de parsing:');
      console.log(data);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Erreur de connexion:', err.message);
  console.error('   Assurez-vous que le serveur fonctionne sur http://localhost:3000');
  process.exit(1);
});

form.pipe(req);
