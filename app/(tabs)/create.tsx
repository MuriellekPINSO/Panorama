import PanoramaCapture from '@/components/PanoramaCapture';

/**
 * 360° Spherical Capture Screen
 * Captures photos covering the full sphere using DeviceMotion guidance.
 * Output: VR/AR-compatible equirectangular panorama.
 */
export default function CreateScreen() {
  return <PanoramaCapture />;
}
