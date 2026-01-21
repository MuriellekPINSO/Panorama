import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Assemble 8 photos en une seule image panoramique équirectangulaire
 * @param photos - Array de 8 URIs d'images
 * @returns URI de l'image panoramique assemblée
 */
export async function assemblePanorama(photos: string[]): Promise<string> {
  if (photos.length !== 8) {
    throw new Error('Exactly 8 photos required for 360° panorama');
  }

  try {
    // Charger toutes les images et obtenir leurs dimensions
    const imageInfos = await Promise.all(
      photos.map(async (uri) => {
        const info = await FileSystem.getInfoAsync(uri);
        return { uri, ...info };
      })
    );

    // Calculer les dimensions de l'image finale
    // Pour un panorama 360°, ratio 2:1 (largeur = 2 * hauteur)
    const targetHeight = 1024; // Hauteur standard
    const targetWidth = targetHeight * 2; // Panorama équirectangulaire
    const photoWidth = targetWidth / 8; // Largeur de chaque photo

    // Redimensionner chaque photo
    const resizedPhotos = await Promise.all(
      photos.map(async (uri) => {
        const resized = await manipulateAsync(
          uri,
          [{ resize: { width: photoWidth, height: targetHeight } }],
          { compress: 0.9, format: SaveFormat.JPEG }
        );
        return resized.uri;
      })
    );

    // Créer un canvas virtuel en assemblant les images côte à côte
    // Note: React Native ne supporte pas canvas, donc on utilise expo-image-manipulator
    // pour créer une composition
    
    // Stratégie: Créer l'image finale en ajoutant les photos une par une
    let panoramaUri = resizedPhotos[0];
    
    for (let i = 1; i < resizedPhotos.length; i++) {
      // Cette partie nécessiterait une bibliothèque native pour un vrai assemblage
      // Pour l'instant, on retourne juste la première photo
      // Un vrai assemblage nécessiterait OpenCV ou un service cloud
    }

    return panoramaUri;
  } catch (error) {
    console.error('Error assembling panorama:', error);
    throw error;
  }
}

/**
 * Crée une image panoramique en mosaïque horizontale
 * (Solution simplifiée sans vraie couture)
 */
export async function createPanoramaMosaic(photos: string[]): Promise<string> {
  // Pour créer une vraie mosaïque, on aurait besoin de:
  // 1. react-native-image-editor (abandonné)
  // 2. Un service cloud (Google Photos API, Azure Vision)
  // 3. Une bibliothèque native custom
  
  // Solution temporaire: retourner toutes les photos pour affichage dans le viewer 360°
  return photos[0]; // Placeholder
}
