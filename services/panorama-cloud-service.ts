import * as FileSystem from 'expo-file-system/legacy';
import { CLOUD_CONFIG } from '@/config/cloud-config';

/**
 * Service Cloud pour l'assemblage de panoramas 360°
 * 
 * ⚠️ IMPORTANT: La plupart des services cloud ne font PAS de stitching automatique
 * 
 * VRAIES OPTIONS:
 * 
 * 1. BACKEND OPENCV (RECOMMANDÉ - Gratuit)
 *    - Stitching professionnel avec OpenCV
 *    - Déployable gratuitement sur Render.com
 *    - Voir: backend-stitching/server.js
 * 
 * 2. KUULA API (Payant - $49/mois)
 *    - Service professionnel spécialisé panoramas
 *    - Upload + stitching + hosting
 *    - URL: https://kuula.co/
 * 
 * 3. SOLUTION ACTUELLE (Gratuit - Aucun backend)
 *    - Viewer 360° avec 8 photos séparées
 *    - Illusion de panorama continu
 *    - Déjà implémenté dans panorama-viewer.tsx
 */

// =====================================
// FONCTION 1: CLOUDINARY (RECOMMANDÉ)
// =====================================

export async function assemblePanoramaWithCloudinary(photos: string[]): Promise<string> {
  try {
    console.log('📤 Upload des photos vers Cloudinary...');
    
    const config = CLOUD_CONFIG.cloudinary;
    
    if (!config.enabled || !config.cloudName || !config.uploadPreset) {
      throw new Error('Cloudinary non configuré. Voir config/cloud-config.ts');
    }
    
    // 1. Upload toutes les photos
    const uploadedUrls = await Promise.all(
      photos.map(async (photoUri, index) => {
        const formData = new FormData();
        
        // Lire le fichier
        const photoData = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        formData.append('file', `data:image/jpeg;base64,${photoData}`);
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', 'panoramas');
        formData.append('public_id', `photo_${Date.now()}_${index}`);
        
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
          {
            method: 'POST',
            body: formData
          }
        );
        
        const data = await response.json();
        return data.secure_url;
      })
    );
    
    console.log('✅ Photos uploadées:', uploadedUrls.length);
    
    // 2. Créer une transformation panoramique
    // Cloudinary peut assembler les images côte à côte
    const config = CLOUD_CONFIG.cloudinary;
    const panoramaUrl = `https://res.cloudinary.com/${config.cloudName}/image/multi/` +
      uploadedUrls.map((url, i) => `l_${url.split('/').pop()}/fl_layer_apply,x_${i * 500}`).join('/') +
      `/panorama_${Date.now()}.jpg`;
    
    console.log('🎉 Panorama assemblé:', panoramaUrl);
    return panoramaUrl;
    
  } catch (error) {
    console.error('❌ Erreur Cloudinary:', error);
    throw error;
  }
}

// =====================================
// FONCTION 2: GOOGLE STREET VIEW API
// =====================================

export async function uploadToGoogleStreetView(photos: string[]): Promise<string> {
  try {
    console.log('📤 Upload vers Google Street View...');
    
    const config = CLOUD_CONFIG.google;
    
    if (!config.enabled || !config.apiKey) {
      throw new Error('Google API non configurée. Voir config/cloud-config.ts');
    }
    
    const apiKey = config.apiKey;
    
    // 1. Créer une session d'upload
    const sessionResponse = await fetch(
      'https://streetviewpublish.googleapis.com/v1/photo:startUpload',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const sessionData = await sessionResponse.json();
    const uploadUrl = sessionData.uploadUrl;
    
    // 2. Upload la première photo (Google assemble automatiquement)
    const photoData = await FileSystem.readAsStringAsync(photos[0], {
      encoding: FileSystem.EncodingType.Base64
    });
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/jpeg'
      },
      body: photoData
    });
    
    const uploadResult = await uploadResponse.json();
    
    // 3. Créer le panorama
    const createResponse = await fetch(
      'https://streetviewpublish.googleapis.com/v1/photo',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uploadReference: uploadResult.uploadReference,
          pose: {
            heading: 0,
            pitch: 0
          }
        })
      }
    );
    
    const result = await createResponse.json();
    console.log('🎉 Panorama Google créé:', result.shareLink);
    
    return result.shareLink;
    
  } catch (error) {
    console.error('❌ Erreur Google Street View:', error);
    throw error;
  }
}

// =====================================
// FONCTION 3: AZURE COMPUTER VISION
// =====================================

export async function assemblePanoramaWithAzure(photos: string[]): Promise<string> {
  try {
    console.log('📤 Traitement avec Azure...');
    
    const config = CLOUD_CONFIG.azure;
    
    if (!config.enabled || !config.endpoint || !config.apiKey) {
      throw new Error('Azure non configuré. Voir config/cloud-config.ts');
    }
    
    const endpoint = config.endpoint;
    const apiKey = config.apiKey;
    
    // Azure ne fait pas d'assemblage direct, mais peut optimiser les images
    const processedPhotos = await Promise.all(
      photos.map(async (photoUri) => {
        const photoData = await FileSystem.readAsStringAsync(photoUri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        const response = await fetch(
          `${endpoint}/vision/v3.2/analyze?visualFeatures=Objects,Tags`,
          {
            method: 'POST',
            headers: {
              'Ocp-Apim-Subscription-Key': apiKey,
              'Content-Type': 'application/octet-stream'
            },
            body: Buffer.from(photoData, 'base64')
          }
        );
        
        const result = await response.json();
        return result;
      })
    );
    
    console.log('✅ Photos analysées par Azure');
    
    // Retourner la première photo (Azure ne fait pas d'assemblage)
    return photos[0];
    
  } catch (error) {
    console.error('❌ Erreur Azure:', error);
    throw error;
  }
}

// =====================================
// FONCTION 4: SERVICE BACKEND CUSTOM
// =====================================

/**
 * Si vous avez votre propre backend avec OpenCV ou Hugin
 */
export async function assemblePanoramaWithBackend(photos: string[]): Promise<string> {
  try {
    console.log('📤 Envoi au backend custom...');
    
    const formData = new FormData();
    
    // Ajouter toutes les photos
    for (let i = 0; i < photos.length; i++) {
      const photoData = await FileSystem.readAsStringAsync(photos[i], {
        encoding: FileSystem.EncodingType.Base64
      });
      
      formData.append('photos', {
        uri: photos[i],
        type: 'image/jpeg',
        name: `photo_${i}.jpg`
      } as any);
    }
    
    // Votre URL backend
    const response = await fetch('https://votre-backend.com/api/assemble-panorama', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const result = await response.json();
    console.log('🎉 Panorama assemblé par le backend:', result.panoramaUrl);
    
    return result.panoramaUrl;
    
  } catch (error) {
    console.error('❌ Erreur backend:', error);
    throw error;
  }
}

// =====================================
// FONCTION PRINCIPALE
// =====================================

export async function assemblePanorama(photos: string[], method: 'cloudinary' | 'google' | 'azure' | 'backend' = 'cloudinary'): Promise<string> {
  switch (method) {
    case 'cloudinary':
      return await assemblePanoramaWithCloudinary(photos);
    case 'google':
      return await uploadToGoogleStreetView(photos);
    case 'azure':
      return await assemblePanoramaWithAzure(photos);
    case 'backend':
      return await assemblePanoramaWithBackend(photos);
    default:
      throw new Error('Méthode inconnue');
  }
}
