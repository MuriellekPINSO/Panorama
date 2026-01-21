/**
 * ⚙️ Configuration des Services Cloud
 * 
 * IMPORTANT: NE COMMITEZ JAMAIS CE FICHIER AVEC VOS VRAIES CLÉS !
 * Ajoutez ce fichier à .gitignore
 * 
 * Pour obtenir vos clés, suivez le guide: CLOUD_SETUP_GUIDE.md
 */

export const CLOUD_CONFIG = {
  // 🎯 SERVICE ACTIF (changez selon votre choix)
  activeService: 'local' as 'cloudinary' | 'google' | 'azure' | 'backend' | 'local',
  
  // ☁️ CLOUDINARY (Recommandé - Gratuit: 25 crédits/mois)
  // Guide: https://cloudinary.com/documentation
  cloudinary: {
    enabled: false,
    cloudName: '', // Ex: 'dxyz123abc'
    uploadPreset: '', // Ex: 'panorama_preset'
    apiKey: '',
    apiSecret: ''
  },
  
  // 🗺️ GOOGLE STREET VIEW API (Gratuit: 100/jour)
  // Guide: https://developers.google.com/streetview/publish
  google: {
    enabled: false,
    apiKey: '', // Ex: 'AIzaSyABCDEFGH...'
    projectId: '' // Ex: 'panoramaapp-123'
  },
  
  // ☁️ AZURE COMPUTER VISION (Gratuit: 5000/mois)
  // Guide: https://azure.microsoft.com/services/cognitive-services/computer-vision/
  azure: {
    enabled: false,
    endpoint: '', // Ex: 'https://eastus.api.cognitive.microsoft.com/'
    apiKey: '' // Ex: 'abc123def456...'
  },
  
  // 🖥️ BACKEND CUSTOM
  // Guide: Voir CLOUD_SETUP_GUIDE.md section "Backend Custom"
  backend: {
    enabled: false,
    endpoint: '' // Ex: 'https://votre-backend.com/api/assemble-panorama'
  }
};

// 📝 EXEMPLE DE CONFIGURATION COMPLÈTE (à copier après avoir obtenu vos clés)
/*
export const CLOUD_CONFIG = {
  activeService: 'cloudinary',
  
  cloudinary: {
    enabled: true,
    cloudName: 'dxyz123abc',
    uploadPreset: 'panorama_preset',
    apiKey: '123456789012345',
    apiSecret: 'abcdefghijklmnopqrstuvwxyz'
  },
  
  google: {
    enabled: false,
    apiKey: 'AIzaSyABCDEFGH...',
    projectId: 'panoramaapp-123'
  },
  
  azure: {
    enabled: false,
    endpoint: 'https://eastus.api.cognitive.microsoft.com/',
    apiKey: 'abc123def456...'
  },
  
  backend: {
    enabled: false,
    endpoint: 'https://votre-backend.com/api/assemble-panorama'
  }
};
*/
