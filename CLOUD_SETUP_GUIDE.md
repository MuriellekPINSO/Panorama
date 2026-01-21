# 🌍 Guide d'intégration des Services Cloud pour Panoramas 360°

## 📋 Table des matières
1. [Cloudinary (Recommandé - Gratuit)](#cloudinary)
2. [Google Street View API](#google)
3. [Azure Computer Vision](#azure)
4. [Backend Custom avec OpenCV](#backend)

---

## 🎯 Option 1: CLOUDINARY (Le plus simple)

### ✅ Avantages
- ✅ **Gratuit** jusqu'à 25 crédits/mois
- ✅ Très simple à configurer (5 minutes)
- ✅ Peut assembler des images automatiquement
- ✅ CDN rapide pour le streaming

### 📝 Configuration (5 minutes)

#### Étape 1: Créer un compte
1. Allez sur https://cloudinary.com/users/register/free
2. Créez un compte gratuit
3. Vérifiez votre email

#### Étape 2: Obtenir vos identifiants
1. Connectez-vous à https://cloudinary.com/console
2. Vous verrez votre **Dashboard** avec:
   - **Cloud Name** (ex: `dxyz123abc`)
   - **API Key** (ex: `123456789012345`)
   - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz`)

#### Étape 3: Créer un Upload Preset
1. Allez dans **Settings** → **Upload**
2. Scroll jusqu'à **Upload presets**
3. Cliquez sur **Add upload preset**
4. Configurez:
   - **Preset name**: `panorama_preset`
   - **Signing Mode**: `Unsigned` (pour mobile)
   - **Folder**: `panoramas`
5. Cliquez sur **Save**

#### Étape 4: Ajouter les clés dans votre app
Ouvrez `services/panorama-cloud-service.ts` et remplacez:

```typescript
const CLOUD_CONFIG = {
  cloudinary: {
    cloudName: 'dxyz123abc',        // ← Votre Cloud Name
    uploadPreset: 'panorama_preset', // ← Votre preset
    apiKey: '123456789012345',       // ← Votre API Key
    apiSecret: 'abc123...'            // ← Votre API Secret
  }
};
```

---

## 🗺️ Option 2: GOOGLE STREET VIEW API

### ✅ Avantages
- ✅ **Gratuit** jusqu'à 100 requêtes/jour
- ✅ Intégration avec Google Maps
- ✅ Qualité professionnelle
- ✅ Publier sur Google Street View

### 📝 Configuration (10 minutes)

#### Étape 1: Créer un projet Google Cloud
1. Allez sur https://console.cloud.google.com/
2. Créez un compte Google Cloud (300$ de crédits gratuits)
3. Créez un nouveau projet:
   - Cliquez sur **Select a project** → **New Project**
   - Nom: `PanoramaApp`
   - Cliquez sur **Create**

#### Étape 2: Activer l'API
1. Dans le menu, allez à **APIs & Services** → **Library**
2. Cherchez `Street View Publish API`
3. Cliquez sur **ENABLE**

#### Étape 3: Créer une clé API
1. Allez à **APIs & Services** → **Credentials**
2. Cliquez sur **+ CREATE CREDENTIALS** → **API key**
3. Copiez votre clé (ex: `AIzaSyABCDEFGH...`)
4. Cliquez sur **Restrict Key**:
   - **Application restrictions**: `None` (pour mobile)
   - **API restrictions**: Sélectionnez `Street View Publish API`
5. Cliquez sur **Save**

#### Étape 4: Ajouter la clé dans votre app
```typescript
const CLOUD_CONFIG = {
  google: {
    apiKey: 'AIzaSyABCDEFGH...',  // ← Votre API Key
    projectId: 'panoramaapp-123'  // ← Votre Project ID
  }
};
```

#### Étape 5: Configurer OAuth (Optionnel)
Pour publier publiquement, vous devez configurer OAuth 2.0:
1. **APIs & Services** → **OAuth consent screen**
2. Configurez l'écran de consentement
3. Créez des **credentials OAuth 2.0**

---

## ☁️ Option 3: AZURE COMPUTER VISION

### ✅ Avantages
- ✅ **Gratuit** jusqu'à 5000 appels/mois
- ✅ Analyse d'images puissante
- ✅ Détection d'objets et tags

### 📝 Configuration (10 minutes)

#### Étape 1: Créer un compte Azure
1. Allez sur https://portal.azure.com/
2. Créez un compte (200$ de crédits gratuits)

#### Étape 2: Créer une ressource Computer Vision
1. Dans Azure Portal, cliquez sur **Create a resource**
2. Cherchez `Computer Vision`
3. Cliquez sur **Create**
4. Configurez:
   - **Subscription**: Votre abonnement
   - **Resource group**: Créez `PanoramaRG`
   - **Region**: `East US`
   - **Name**: `panorama-vision`
   - **Pricing tier**: `Free F0` (gratuit)
5. Cliquez sur **Review + Create** → **Create**

#### Étape 3: Obtenir les clés
1. Allez dans votre ressource `panorama-vision`
2. Dans le menu, cliquez sur **Keys and Endpoint**
3. Copiez:
   - **KEY 1** (ex: `abc123def456...`)
   - **Endpoint** (ex: `https://eastus.api.cognitive.microsoft.com/`)

#### Étape 4: Ajouter dans votre app
```typescript
const CLOUD_CONFIG = {
  azure: {
    endpoint: 'https://eastus.api.cognitive.microsoft.com/',
    apiKey: 'abc123def456...'
  }
};
```

---

## 🖥️ Option 4: BACKEND CUSTOM avec OpenCV

### ✅ Avantages
- ✅ 100% gratuit
- ✅ Contrôle total
- ✅ Pas de limite
- ✅ Assemblage de qualité professionnelle

### 📝 Configuration (30 minutes)

Créez un backend Node.js avec OpenCV:

#### server.js (Backend)
```javascript
const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/api/assemble-panorama', upload.array('photos', 8), (req, res) => {
  const photos = req.files.map(f => f.path).join(' ');
  
  // Utiliser Hugin pour assembler (outil open-source)
  const outputPath = `panoramas/panorama_${Date.now()}.jpg`;
  
  exec(`pto_gen ${photos} -o project.pto && autooptimiser -a -l -s -o project.pto project.pto && nona -o ${outputPath} project.pto`, 
    (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      res.json({ panoramaUrl: `https://votre-serveur.com/${outputPath}` });
    }
  );
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

#### Déploiement
Vous pouvez déployer gratuitement sur:
- **Heroku** (gratuit)
- **Railway** (gratuit)
- **Render** (gratuit)
- **Vercel** (gratuit pour serverless)

---

## 🚀 Utilisation dans l'app

Une fois configuré, modifiez `app/(tabs)/create.tsx`:

```typescript
import { assemblePanorama } from '@/services/panorama-cloud-service';

// Dans savePanorama():
const panoramaUrl = await assemblePanorama(photos, 'cloudinary'); // ou 'google', 'azure', 'backend'

// Sauvegarder l'URL au lieu des photos individuelles
const panorama = {
  id: panoramaId,
  title: `Photo 360° ${new Date().toLocaleDateString('fr-FR')}`,
  panoramaUrl: panoramaUrl,  // ← URL du panorama assemblé
  photos: savedPhotos,
  thumbnail: savedPhotos[0],
  createdAt: timestamp,
  photoCount: photos.length
};
```

---

## 💡 Quelle option choisir ?

| Service | Gratuit | Simplicité | Qualité | Temps setup |
|---------|---------|------------|---------|-------------|
| **Cloudinary** | ✅ 25 crédits/mois | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 5 min |
| **Google** | ✅ 100/jour | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 10 min |
| **Azure** | ✅ 5000/mois | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 10 min |
| **Backend** | ✅ Illimité | ⭐⭐ | ⭐⭐⭐⭐⭐ | 30 min |

### 🎯 Recommandation
**Commencez avec Cloudinary** - Le plus simple et rapide à mettre en place !
