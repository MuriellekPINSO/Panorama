import * as FileSystem from 'expo-file-system/legacy';

/**
 * Configuration for the stitching backend
 */
export interface StitchingConfig {
  serverUrl: string;
  timeout?: number;
}

/**
 * Orientation data for each captured photo
 */
export interface PhotoOrientation {
  targetId: number;
  yaw: number;    // degrees, 0-360
  pitch: number;  // degrees, -90 to +90
  roll: number;   // degrees
  timestamp: number;
}

/**
 * Upload spherical capture photos to backend for equirectangular stitching.
 *
 * The backend uses OpenCV to:
 *   - Feature-match overlapping photos
 *   - Compute homographies and camera parameters
 *   - Warp all photos onto a spherical projection
 *   - Output a 2:1 equirectangular JPEG (VR/AR-ready)
 *
 * @param photos  Array of local file URIs (JPEG)
 * @param orientations  Per-photo device orientation at capture time
 * @param config  Server URL and timeout
 * @param onProgress  Optional upload progress callback (0-100)
 * @returns Local file path of the downloaded equirectangular panorama
 */
export async function assembleSphericalPanorama(
  photos: string[],
  orientations: PhotoOrientation[],
  config: StitchingConfig,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (photos.length < 3) {
    throw new Error(`Need at least 3 photos, got ${photos.length}`);
  }

  // 1. Verify all photos exist
  for (let i = 0; i < photos.length; i++) {
    const info = await FileSystem.getInfoAsync(photos[i]);
    if (!info.exists) throw new Error(`Photo ${i + 1} not found: ${photos[i]}`);
  }

  // 2. Check server health
  try {
    const health = await fetch(`${config.serverUrl}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!health.ok) throw new Error(`Health check ${health.status}`);
  } catch (e: any) {
    throw new Error(`Server unreachable at ${config.serverUrl}: ${e.message}`);
  }

  onProgress?.(5);

  // 3. Build multipart form data
  const formData = new FormData();

  for (let i = 0; i < photos.length; i++) {
    const base64 = await FileSystem.readAsStringAsync(photos[i], {
      encoding: FileSystem.EncodingType.Base64,
    });
    const blob = await (await fetch(`data:image/jpeg;base64,${base64}`)).blob();

    const ori = orientations[i];
    const name = `photo_${ori?.targetId ?? i}_y${Math.round(ori?.yaw ?? 0)}_p${Math.round(ori?.pitch ?? 0)}.jpg`;
    formData.append('photos', blob, name);

    onProgress?.(5 + Math.round((i / photos.length) * 40));
  }

  // Attach orientation metadata so the stitcher can use it for initial alignment
  formData.append(
    'metadata',
    JSON.stringify({
      captureType: 'spherical-360',
      photoCount: photos.length,
      orientations,
      timestamp: new Date().toISOString(),
    }),
  );

  onProgress?.(50);

  // 4. Upload & stitch
  const timeout = config.timeout || 300_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);

  try {
    const resp = await fetch(`${config.serverUrl}/api/stitch-panorama`, {
      method: 'POST',
      body: formData,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Server error ${resp.status}: ${text}`);
    }

    const result = await resp.json();
    if (!result.success) throw new Error(result.error || 'Stitching failed');

    onProgress?.(80);

    // 5. Download result locally
    return await downloadPanorama(result.panoramaUrl);
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Stitching timed out');
    throw e;
  }
}

/**
 * Download a stitched panorama JPEG and save to the app's document directory.
 */
async function downloadPanorama(url: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}panoramas/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const localPath = `${dir}pano_${Date.now()}.jpg`;
  await FileSystem.downloadAsync(url, localPath);
  return localPath;
}
