/**
 * Configuration du serveur backend pour l'assemblage panoramique
 * 
 * INSTRUCTIONS:
 * 1. En développement local, utilisez votre IP locale (pas localhost!)
 * 2. Pour trouver votre IP: 
 *    - Windows: ipconfig
 *    - Mac/Linux: ifconfig ou ip addr
 * 3. Assurez-vous que le serveur backend est démarré (cd backend-stitching && npm start)
 */

// Configuration selon l'environnement
const isDevelopment = __DEV__;

// URL du serveur backend
// ⚠️ IMPORTANT: Remplacez par votre IP locale pour le développement mobile
export const STITCHING_CONFIG = {
  // URL du serveur d'assemblage
  // En développement: utilisez votre IP locale (ex: http://192.168.1.100:3000)
  // En production: utilisez l'URL de votre serveur déployé
  serverUrl: isDevelopment 
    ? 'http://192.168.1.100:3000'  // ← Changez cette IP par la vôtre!
    : 'https://votre-serveur.onrender.com',
  
  // Timeout pour l'assemblage (5 minutes)
  timeout: 300000,
  
  // Qualité des images uploadées (0.0 - 1.0)
  uploadQuality: 0.85,
  
  // Nombre de tentatives en cas d'échec
  maxRetries: 2,
};

/**
 * Obtenir l'URL du serveur
 * Utilise la variable d'environnement si définie, sinon la config par défaut
 */
export function getServerUrl(): string {
  // Priorité: variable d'environnement > config
  if (process.env.EXPO_PUBLIC_STITCHING_SERVER) {
    return process.env.EXPO_PUBLIC_STITCHING_SERVER;
  }
  return STITCHING_CONFIG.serverUrl;
}

/**
 * Vérifier si le serveur est accessible
 */
export async function checkServerHealth(): Promise<{
  available: boolean;
  pythonOpenCV: boolean;
  error?: string;
}> {
  try {
    const response = await fetch(`${getServerUrl()}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      return { available: false, pythonOpenCV: false, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    return {
      available: true,
      pythonOpenCV: data.capabilities?.pythonOpenCV || false,
    };
  } catch (error: any) {
    return {
      available: false,
      pythonOpenCV: false,
      error: error.message || 'Serveur non accessible',
    };
  }
}
