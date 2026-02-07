/**
 * Mock Panorama Service for Teleport Feature
 */

interface GeospatialMetadata {
  lat: number;
  lon: number;
  accuracy: number;
  timestamp: number;
}

interface PanoramaResult {
  panoramaId: string;
  viewUrl?: string;
}

interface UploadProgress {
  percent: number;
}

const PanoramaService = {
  getGeospatialMetadata: async (): Promise<GeospatialMetadata> => {
    // Return mock data for now
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          lat: 48.8566,
          lon: 2.3522,
          accuracy: 10,
          timestamp: Date.now(),
        });
      }, 500);
    });
  },

  createPanorama: async (
    images: { uri: string; type: string; fileName: string }[],
    metadata: GeospatialMetadata,
    onProgress: (progress: UploadProgress) => void
  ): Promise<PanoramaResult> => {
    console.log('Creating panorama with', images.length, 'images');

    // Simulate upload progress
    const steps = 5;
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      onProgress({ percent: (i / steps) * 100 });
    }

    return {
      panoramaId: `pano_${Date.now()}`,
      viewUrl: 'https://example.com/view/pano_123',
    };
  },
};

export default PanoramaService;
