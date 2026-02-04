#!/usr/bin/env node
/**
 * Script de configuration locale pour le serveur de stitching
 * 
 * Utilisation: node setup-local.js
 * 
 * Ce script:
 * 1. Trouve votre IP locale
 * 2. Met à jour la config de l'app
 * 3. Vérifie que Python/OpenCV est installé
 */

const { networkInterfaces } = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🔧 Configuration du Serveur Panorama                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// 1. Trouver l'IP locale
function getLocalIP() {
  const nets = networkInterfaces();
  const results = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Ignorer les adresses non-IPv4 et internes
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  
  // Préférer les adresses WiFi/Ethernet communes
  const preferred = results.find(r => 
    r.address.startsWith('192.168.') || 
    r.address.startsWith('10.') ||
    r.address.startsWith('172.')
  );
  
  return preferred || results[0];
}

// 2. Vérifier Python et OpenCV
function checkPython() {
  console.log('🐍 Vérification de Python et OpenCV...\n');
  
  const pythonCmds = process.platform === 'win32' 
    ? ['python', 'python3', 'py'] 
    : ['python3', 'python'];
  
  for (const cmd of pythonCmds) {
    try {
      const version = execSync(`${cmd} --version 2>&1`, { encoding: 'utf8' }).trim();
      console.log(`   ✅ ${version}`);
      
      // Vérifier OpenCV
      try {
        const cvVersion = execSync(
          `${cmd} -c "import cv2; print(f'OpenCV {cv2.__version__}')"`,
          { encoding: 'utf8' }
        ).trim();
        console.log(`   ✅ ${cvVersion}`);
        return { available: true, cmd };
      } catch {
        console.log('   ⚠️ OpenCV non installé');
        console.log(`      → Installez avec: ${cmd} -m pip install opencv-python numpy`);
        return { available: false, cmd };
      }
    } catch {
      continue;
    }
  }
  
  console.log('   ❌ Python non trouvé');
  console.log('      → Installez Python: https://www.python.org/downloads/');
  return { available: false, cmd: null };
}

// 3. Mettre à jour la config de l'app
function updateAppConfig(ip, port = 3000) {
  const configPath = path.join(__dirname, '..', 'config', 'stitching-config.ts');
  
  if (fs.existsSync(configPath)) {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Remplacer l'IP dans la config
    const oldPattern = /serverUrl: isDevelopment[^}]+/;
    const newConfig = `serverUrl: isDevelopment 
    ? 'http://${ip}:${port}'  // IP configurée automatiquement
    : 'https://votre-serveur.onrender.com'`;
    
    if (content.match(oldPattern)) {
      content = content.replace(oldPattern, newConfig);
      fs.writeFileSync(configPath, content);
      console.log(`   ✅ Config mise à jour avec IP: ${ip}:${port}`);
      return true;
    }
  }
  
  console.log('   ⚠️ Fichier config non trouvé, mise à jour manuelle requise');
  return false;
}

// Exécution
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Étape 1: IP locale
console.log('📡 Recherche de l\'IP locale...\n');
const ipInfo = getLocalIP();
if (ipInfo) {
  console.log(`   ✅ IP trouvée: ${ipInfo.address} (${ipInfo.name})`);
} else {
  console.log('   ❌ Aucune IP locale trouvée');
  process.exit(1);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Étape 2: Python
const pythonInfo = checkPython();

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Étape 3: Config app
console.log('⚙️  Mise à jour de la configuration...\n');
updateAppConfig(ipInfo.address);

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Résumé
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     📋 RÉSUMÉ DE CONFIGURATION                            ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  IP Locale:    ${ipInfo.address.padEnd(42)}║`);
console.log(`║  Port:         3000                                        ║`);
console.log(`║  URL Serveur:  http://${ipInfo.address}:3000`.padEnd(61) + '║');
console.log(`║  Python:       ${pythonInfo.available ? '✅ Disponible' : '⚠️ Non disponible'}`);
console.log('╚════════════════════════════════════════════════════════════╝');

console.log('\n📌 PROCHAINES ÉTAPES:\n');
console.log('   1. Démarrer le serveur:');
console.log('      cd backend-stitching && npm start\n');
console.log('   2. Sur votre téléphone, assurez-vous d\'être sur le MÊME réseau WiFi\n');
console.log('   3. Lancez l\'app Expo et prenez vos photos 360°\n');

if (!pythonInfo.available) {
  console.log('   ⚠️  ATTENTION: Sans Python/OpenCV, le serveur utilisera le mode');
  console.log('      simple (assemblage basique sans correction de perspective).\n');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
