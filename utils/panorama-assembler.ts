import * as FileSystem from 'expo-file-system/legacy';

/**
 * Interface pour la configuration du serveur de stitching
 */
export interface StitchingConfig {
  serverUrl: string;
  timeout?: number;
  quality?: number;
}

/**
 * Upload photos to backend stitching server for panorama assembly
 * Uses OpenCV on the backend to perform proper image stitching with:
 * - Feature detection and matching
 * - Geometric alignment
 * - Distortion correction
 * - Seamless edge blending
 * 
 * @param photos - Array of photo file URIs to stitch
 * @param config - Backend server configuration
 * @returns Promise resolving to the stitched panorama URI
 */
export async function assemblePanorama(
  photos: string[],
  config: StitchingConfig
): Promise<string> {
  console.log('🔄 assemblePanorama called with:', {
    photoCount: photos.length,
    serverUrl: config.serverUrl,
    timeout: config.timeout
  });

  if (photos.length !== 8) {
    throw new Error(`Exactly 8 photos required for 360° panorama, got ${photos.length}`);
  }

  // Vérifier que toutes les photos existent
  for (let i = 0; i < photos.length; i++) {
    const info = await FileSystem.getInfoAsync(photos[i]);
    if (!info.exists) {
      throw new Error(`Photo ${i + 1} not found: ${photos[i]}`);
    }
    console.log(`✓ Photo ${i + 1} verified: ${(info.size || 0) / 1024} KB`);
  }

  try {
    console.log('🔄 Starting panorama stitching process...');

    // D'abord, vérifier si le serveur est accessible
    console.log(`🔍 Checking server health at ${config.serverUrl}...`);
    try {
      const healthCheck = await fetch(`${config.serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 secondes timeout pour le health check
      });
      
      if (!healthCheck.ok) {
        throw new Error(`Server health check failed: ${healthCheck.status}`);
      }
      console.log('✅ Server is healthy');
    } catch (healthError: any) {
      console.error('❌ Server not reachable:', healthError.message);
      throw new Error(`Serveur non accessible: ${config.serverUrl}. Vérifiez que le serveur backend est démarré.`);
    }

    // Create FormData to upload all photos
    const formData = new FormData();

    // Add each photo to the form data
    for (let i = 0; i < photos.length; i++) {
      const photoUri = photos[i];
      console.log(`📤 Preparing photo ${i + 1}/8: ${photoUri}`);
      
      // Read file and create blob
      const fileData = await FileSystem.readAsStringAsync(photoUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      console.log(`   Base64 length: ${fileData.length} chars`);
      
      // Create blob from base64
      const blob = await (async () => {
        const res = await fetch(`data:image/jpeg;base64,${fileData}`);
        return res.blob();
      })();

      console.log(`   Blob size: ${blob.size} bytes`);
      formData.append('photos', blob, `photo_${i}.jpg`);
    }

    console.log(`📤 Uploading ${photos.length} photos to stitching server...`);

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutMs = config.timeout || 300000; // 5 minutes default
    const timeoutId = setTimeout(() => {
      console.log('⏰ Request timeout reached, aborting...');
      abortController.abort();
    }, timeoutMs);

    // Send to backend stitching server
    console.log(`📡 POST ${config.serverUrl}/api/stitch-panorama`);
    const response = await fetch(`${config.serverUrl}/api/stitch-panorama`, {
      method: 'POST',
      body: formData,
      signal: abortController.signal
    });

    clearTimeout(timeoutId);

    console.log(`📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server error (${response.status}): ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📦 Server response:', result);

    if (!result.success) {
      throw new Error(result.error || 'Panorama stitching failed on server');
    }

    console.log('✅ Panorama successfully stitched!');
    console.log(`📊 Stitched panorama URL: ${result.panoramaUrl}`);

    // Download the stitched panorama to local storage
    return await downloadPanorama(result.panoramaUrl);

  } catch (error: any) {
    console.error('❌ Error during panorama stitching:', error);
    
    // Améliorer les messages d'erreur
    if (error.name === 'AbortError') {
      throw new Error('Timeout: L\'assemblage a pris trop de temps. Réessayez.');
    }
    if (error.message?.includes('Network request failed')) {
      throw new Error('Erreur réseau: Impossible de joindre le serveur d\'assemblage.');
    }
    
    throw error;
  }
}

/**
 * Download stitched panorama from server and save locally
 */
async function downloadPanorama(panoramaUrl: string): Promise<string> {
  try {
    // Create panoramas directory
    const panoramaDir = `${FileSystem.documentDirectory}stitched-panoramas/`;
    const dirInfo = await FileSystem.getInfoAsync(panoramaDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(panoramaDir, { intermediates: true });
    }

    // Download panorama
    const filename = `panorama_${Date.now()}.jpg`;
    const localPath = `${panoramaDir}${filename}`;

    console.log(`⬇️  Downloading panorama to local storage...`);
    
    const downloadResult = await FileSystem.downloadAsync(
      panoramaUrl,
      localPath
    );

    console.log(`✅ Panorama saved locally: ${localPath}`);
    return localPath;

  } catch (error) {
    console.error('Error downloading panorama:', error);
    throw error;
  }
}

/**
 * Alternative: Create a simple horizontal mosaic without stitching
 * Use this if backend stitching is unavailable
 * Note: This creates individual image tiles, not a seamless panorama
 */
export async function createPanoramaMosaic(photos: string[]): Promise<string[]> {
  // Return all photos as a fallback (app will display as sequence)
  // This is NOT recommended - proper stitching creates true 360° panoramas
  return photos;
}
