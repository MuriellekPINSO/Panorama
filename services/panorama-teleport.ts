/**
 * Teleport 360° Mobile Integration Service
 * Services pour capturer et envoyer panoramas depuis React Native/Expo
 */

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Sensors from 'expo-sensors';
import axios from 'axios';
import FormData from 'form-data';

// ============================================
// CONFIGURATION
// ============================================

export const TELEPORT_CONFIG = {
  // Sur mobile, utiliser l'IP locale (192.168.100.22) au lieu de localhost
  API_URL: process.env.REACT_APP_API_URL || 'http://192.168.100.22:3000',
  MIN_IMAGES: 3,
  MAX_IMAGES: 12,
  PREFERRED_IMAGE_QUALITY: 0.85, // 85% quality for smaller file size
  REQUEST_TIMEOUT: 300000, // 5 minutes
};

// ============================================
// CLASSE PRINCIPALE - PanoramaService
// ============================================

export class PanoramaService {
  /**
   * Sélectionner plusieurs images de la galerie
   */
  static async pickImages(minImages = TELEPORT_CONFIG.MIN_IMAGES) {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permission.granted) {
        throw new Error('Permission galerie refusée');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultiple: true,
        quality: TELEPORT_CONFIG.PREFERRED_IMAGE_QUALITY,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets.length >= minImages) {
        return result.assets.map(asset => ({
          uri: asset.uri,
          type: 'image/jpeg',
          fileName: asset.fileName || `image_${Date.now()}.jpg`,
        }));
      } else if (!result.canceled && result.assets.length < minImages) {
        throw new Error(`Sélectionnez au moins ${minImages} images`);
      }

      return null; // Utilisateur a annulé
    } catch (error) {
      console.error('Erreur sélection images:', error);
      throw error;
    }
  }

  /**
   * Capturer des images depuis la caméra (mode 360°)
   */
  static async captureFor360() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permission.granted) {
        throw new Error('Permission caméra refusée');
      }

      // Capturer image unique
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: TELEPORT_CONFIG.PREFERRED_IMAGE_QUALITY,
      });

      if (!result.canceled) {
        return {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          fileName: `capture_${Date.now()}.jpg`,
        };
      }

      return null;
    } catch (error) {
      console.error('Erreur capture caméra:', error);
      throw error;
    }
  }

  /**
   * Obtenir les métadonnées géospatiales actuelles
   */
  static async getGeospatialMetadata() {
    try {
      // Permission GPS
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('Permission GPS refusée');
        return null;
      }

      // Localisation actuelle
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, altitude, accuracy } = location.coords;

      // Adresse (reverse geocoding)
      let address = 'Unknown Location';
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const { name, street, city, region } = reverseGeocode[0];
          address = [name, street, city, region]
            .filter(Boolean)
            .join(', ');
        }
      } catch (e) {
        console.warn('Reverse geocoding échoué');
      }

      // Orientation de l'appareil
      const orientation = await PanoramaService.getDeviceOrientation();

      return {
        gps: {
          lat: parseFloat(latitude.toFixed(6)),
          lon: parseFloat(longitude.toFixed(6)),
          alt: altitude ? parseFloat(altitude.toFixed(1)) : 0,
          accuracy: parseFloat(accuracy.toFixed(1)),
        },
        location_name: address,
        orientation,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Erreur métadonnées GPS:', error);
      return null;
    }
  }

  /**
   * Obtenir l'orientation de l'appareil (N, S, E, W)
   */
  static async getDeviceOrientation() {
    try {
      const subscription = await Sensors.Magnetometer.addListener(({ x, y }) => {
        // Calculer azimuth
        let azimuth = Math.atan2(y, x) * (180 / Math.PI);
        azimuth = (azimuth + 360) % 360;

        // Convertir en direction cardinale
        if (azimuth >= 337.5 || azimuth < 22.5) return 'north';
        if (azimuth >= 22.5 && azimuth < 67.5) return 'northeast';
        if (azimuth >= 67.5 && azimuth < 112.5) return 'east';
        if (azimuth >= 112.5 && azimuth < 157.5) return 'southeast';
        if (azimuth >= 157.5 && azimuth < 202.5) return 'south';
        if (azimuth >= 202.5 && azimuth < 247.5) return 'southwest';
        if (azimuth >= 247.5 && azimuth < 292.5) return 'west';
        if (azimuth >= 292.5 && azimuth < 337.5) return 'northwest';
      });

      // Retourner la valeur après 1s
      return new Promise((resolve) => {
        setTimeout(() => {
          subscription.remove();
          resolve('north');
        }, 1000);
      });
    } catch (error) {
      console.warn('Erreur orientation:', error);
      return 'north';
    }
  }

  /**
   * Envoyer des images au serveur pour créer panorama 360°
   */
  static async createPanorama(imageArray, metadata = null, onProgress = null) {
    try {
      // Validation
      if (!imageArray || imageArray.length < TELEPORT_CONFIG.MIN_IMAGES) {
        throw new Error(
          `Minimum ${TELEPORT_CONFIG.MIN_IMAGES} images requises, reçu: ${imageArray.length}`
        );
      }

      if (imageArray.length > TELEPORT_CONFIG.MAX_IMAGES) {
        throw new Error(
          `Maximum ${TELEPORT_CONFIG.MAX_IMAGES} images, reçu: ${imageArray.length}`
        );
      }

      // Récupérer métadonnées si non fournies
      if (!metadata) {
        metadata = await PanoramaService.getGeospatialMetadata();
      }

      // Construire FormData
      const formData = new FormData();

      // Ajouter les images
      imageArray.forEach((image, index) => {
        formData.append('photos', {
          uri: image.uri,
          type: image.type || 'image/jpeg',
          name: image.fileName || `photo_${index + 1}_${Date.now()}.jpg`,
        });
      });

      // Ajouter métadonnées
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      // Créer requête avec progress
      const config = {
        timeout: TELEPORT_CONFIG.REQUEST_TIMEOUT,
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percent: percentCompleted,
            });
          }
        },
      };

      // Envoyer
      const response = await axios.post(
        `${TELEPORT_CONFIG.API_URL}/api/stitch-panorama`,
        formData,
        config
      );

      return response.data;
    } catch (error) {
      console.error('Erreur création panorama:', error);
      throw error;
    }
  }

  /**
   * Récupérer les métadonnées d'un panorama
   */
  static async getPanoramaMetadata(panoramaId) {
    try {
      const response = await axios.get(
        `${TELEPORT_CONFIG.API_URL}/api/panorama/${panoramaId}/metadata`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur récupération métadonnées:', error);
      throw error;
    }
  }

  /**
   * Obtenir une version optimisée du panorama
   */
  static async getPanoramaImage(panoramaId, format = 'streamingHD') {
    try {
      return `${TELEPORT_CONFIG.API_URL}/api/panorama/${panoramaId}/${format}`;
    } catch (error) {
      console.error('Erreur récupération panorama:', error);
      throw error;
    }
  }

  /**
   * Obtenir l'URL du viewer
   */
  static getViewerUrl(panoramaId) {
    return `${TELEPORT_CONFIG.API_URL}/viewer?id=${panoramaId}`;
  }
}

// ============================================
// EXPORT INDIVIDUAL FUNCTIONS FOR FLEXIBILITY
// ============================================

export const pickImages = (minImages) =>
  PanoramaService.pickImages(minImages);

export const captureFor360 = () =>
  PanoramaService.captureFor360();

export const getGeospatialMetadata = () =>
  PanoramaService.getGeospatialMetadata();

export const createPanorama = (images, metadata, onProgress) =>
  PanoramaService.createPanorama(images, metadata, onProgress);

export const getPanoramaMetadata = (panoramaId) =>
  PanoramaService.getPanoramaMetadata(panoramaId);

export const getPanoramaImage = (panoramaId, format) =>
  PanoramaService.getPanoramaImage(panoramaId, format);

export const getViewerUrl = (panoramaId) =>
  PanoramaService.getViewerUrl(panoramaId);

export default PanoramaService;
