/**
 * Guided Teleport 360 capture interface
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Magnetometer } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PanoramaService from '../services/panorama-teleport';

const { width } = Dimensions.get('window');

interface CapturePoint {
  azimuth: number;
  uri: string;
  timestamp: number;
}

interface GuidedCaptureState {
  currentAzimuth: number;
  capturedPoints: CapturePoint[];
  capturing: boolean;
  uploading: boolean;
  progress: number;
  error: string | null;
  panoramaResult: any | null;
}

const CAPTURE_POINTS = 12;
const AZIMUTH_TOLERANCE = 15;
const READY_THRESHOLD = 8;
const VIEWFINDER_SIZE = Math.min(width * 0.78, 320);
const POINTS_AZIMUTHS = Array.from({ length: CAPTURE_POINTS }, (_, index) => (index * 360) / CAPTURE_POINTS);

export const Panorama360CaptureGuided: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<GuidedCaptureState>({
    currentAzimuth: 0,
    capturedPoints: [],
    capturing: false,
    uploading: false,
    progress: 0,
    error: null,
    panoramaResult: null,
  });

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    startCompassTracking();

    return () => {
      Magnetometer.removeAllListeners();
    };
  }, []);

  const startCompassTracking = () => {
    try {
      Magnetometer.removeAllListeners();
      Magnetometer.setUpdateInterval(120);
      Magnetometer.addListener(({ x, y }) => {
        let azimuth = Math.atan2(y, x) * (180 / Math.PI);
        azimuth = (azimuth + 360) % 360;
        setState(prev => ({ ...prev, currentAzimuth: azimuth }));
      });
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Boussole indisponible' }));
    }
  };

  const resetCapture = () => {
    setState(prev => ({
      ...prev,
      capturedPoints: [],
      capturing: false,
      uploading: false,
      progress: 0,
      error: null,
      panoramaResult: null,
    }));
  };

  const getAzimuthDelta = (current: number, target: number): number => {
    return ((target - current + 540) % 360) - 180;
  };

  const isDirectionCorrect = (targetAzimuth: number, tolerance = AZIMUTH_TOLERANCE) => {
    const diff = Math.abs(state.currentAzimuth - targetAzimuth);
    return Math.min(diff, 360 - diff) <= tolerance;
  };

  const getNextCapturePoint = (): number | null => {
    for (const azimuth of POINTS_AZIMUTHS) {
      const alreadyCaptured = state.capturedPoints.some(point => {
        const diff = Math.abs(point.azimuth - azimuth);
        return Math.min(diff, 360 - diff) <= AZIMUTH_TOLERANCE;
      });

      if (!alreadyCaptured) {
        return azimuth;
      }
    }
    return null;
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || state.capturedPoints.length >= CAPTURE_POINTS) {
      return;
    }

    try {
      setState(prev => ({ ...prev, capturing: true, error: null }));
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      const nextPoint: CapturePoint = {
        azimuth: state.currentAzimuth,
        uri: photo.uri,
        timestamp: Date.now(),
      };

      setState(prev => ({
        ...prev,
        capturing: false,
        capturedPoints: [...prev.capturedPoints, nextPoint],
      }));
    } catch (error) {
      setState(prev => ({ ...prev, capturing: false, error: 'Capture impossible, réessayez' }));
    }
  };

  const handleCreatePanorama = async () => {
    if (state.capturedPoints.length < 3) {
      Alert.alert('Erreur', 'Capturez au minimum 3 photos');
      return;
    }

    try {
      setState(prev => ({ ...prev, uploading: true, progress: 0, error: null }));

      const metadata = await PanoramaService.getGeospatialMetadata();

      const result = await PanoramaService.createPanorama(
        state.capturedPoints.map(point => ({
          uri: point.uri,
          type: 'image/jpeg',
          fileName: `capture_${Math.round(point.azimuth)}deg_${point.timestamp}.jpg`,
        })),
        metadata,
        (progress) => {
          setState(prev => ({ ...prev, progress: progress.percent }));
        }
      );

      Alert.alert('✅ Succès!', `Panorama créé: ${result.panoramaId}`);
      setState(prev => ({
        ...prev,
        uploading: false,
        panoramaResult: result,
      }));
    } catch (error: any) {
      Alert.alert('❌ Erreur', error?.message || 'Impossible de créer le panorama');
      setState(prev => ({ ...prev, uploading: false }));
    }
  };

  const nextPoint = getNextCapturePoint();
  const azimuthDelta = nextPoint !== null ? getAzimuthDelta(state.currentAzimuth, nextPoint) : 0;
  const isReadyToCapture = nextPoint !== null && isDirectionCorrect(nextPoint, READY_THRESHOLD);
  const captureProgress = (state.capturedPoints.length / CAPTURE_POINTS) * 100;
  const allCaptured = state.capturedPoints.length >= CAPTURE_POINTS;
  const currentStep = allCaptured ? CAPTURE_POINTS : Math.min(state.capturedPoints.length + 1, CAPTURE_POINTS);
  const normalizedOffset = Math.max(-1, Math.min(1, azimuthDelta / AZIMUTH_TOLERANCE));

  const guidanceMessage = (() => {
    if (nextPoint === null) {
      return 'All photos captured';
    }

    if (Math.abs(azimuthDelta) > AZIMUTH_TOLERANCE) {
      return azimuthDelta > 0 ? 'Tilt your device to the right' : 'Tilt your device to the left';
    }

    if (!isReadyToCapture) {
      return azimuthDelta > 0 ? 'Rotate slowly to the right' : 'Rotate slowly to the left';
    }

    return 'Hold steady and capture';
  })();

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <MaterialCommunityIcons name="camera-off" size={60} color="#999999" />
        <Text style={styles.permissionInfo}>Permission caméra requise</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Activer la caméra</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const renderTopControls = () => (
    <View style={styles.topControls}>
      <TouchableOpacity
        style={styles.topButton}
        onPress={() => resetCapture()}
        accessibilityLabel="Recommencer la capture"
      >
        <MaterialCommunityIcons name="chevron-left" size={26} color="#111111" />
      </TouchableOpacity>

      <View style={styles.topStatus}>
        <Text style={styles.topStatusPrimary}>{currentStep} / {CAPTURE_POINTS}</Text>
        <Text style={styles.topStatusSecondary}>Guided capture</Text>
      </View>

      <TouchableOpacity
        style={[styles.topButton, styles.topButtonClose]}
        onPress={() => resetCapture()}
        accessibilityLabel="Annuler la capture"
      >
        <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  const renderCenterOverlay = () => {
    const captureCircleRadius = 32;
    const containerRadius = VIEWFINDER_SIZE / 2.2;

    return (
      <View style={styles.centerOverlay} pointerEvents="none">
        <View style={[styles.viewfinderBox, { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE * 1.12 }]}>
          {/* Background frame */}
          <View style={styles.viewfinderFrame} />

          {/* Center circle indicator */}
          <View
            style={[
              styles.centerCircleIndicator,
              isReadyToCapture && styles.centerCircleActive,
            ]}
          />

          {/* Captured points (green circles) */}
          {state.capturedPoints.map((point, idx) => {
            const angleIndex = POINTS_AZIMUTHS.findIndex(
              a => Math.abs(a - point.azimuth) <= AZIMUTH_TOLERANCE
            );
            const angle = (angleIndex * 360) / CAPTURE_POINTS;
            const rad = (angle * Math.PI) / 180;
            const x = containerRadius * Math.cos(rad);
            const y = containerRadius * Math.sin(rad);

            return (
              <View
                key={idx}
                style={[
                  styles.capturePointMarker,
                  {
                    left: VIEWFINDER_SIZE / 2 + x - captureCircleRadius,
                    top: VIEWFINDER_SIZE * 0.56 + y - captureCircleRadius,
                  },
                ]}
              />
            );
          })}

          {/* Next target point (if not captured) */}
          {nextPoint !== null && state.capturedPoints.length < CAPTURE_POINTS && (
            (() => {
              const angleIndex = POINTS_AZIMUTHS.findIndex(a => Math.abs(a - nextPoint) <= AZIMUTH_TOLERANCE);
              const angle = (angleIndex * 360) / CAPTURE_POINTS;
              const rad = (angle * Math.PI) / 180;
              const x = containerRadius * Math.cos(rad);
              const y = containerRadius * Math.sin(rad);
              const opacity = isReadyToCapture ? 1 : 0.5;

              return (
                <View
                  style={[
                    styles.nextPointMarker,
                    {
                      left: VIEWFINDER_SIZE / 2 + x - captureCircleRadius / 1.2,
                      top: VIEWFINDER_SIZE * 0.56 + y - captureCircleRadius / 1.2,
                      opacity,
                    },
                  ]}
                >
                  <View style={[styles.nextPointCircle, isReadyToCapture && styles.nextPointReady]} />
                </View>
              );
            })()
          )}
        </View>

        {/* Guidance text */}
        <Text style={styles.guidanceHeadline}>{guidanceMessage}</Text>
      </View>
    );
  };

  const renderBottomPanel = () => {
    if (state.uploading) {
      return (
        <View style={styles.bottomPanel}>
          <ActivityIndicator size="large" color="#F44336" />
          <Text style={styles.bottomPrimary}>Building your panorama...</Text>
          <Text style={styles.bottomSecondary}>{Math.round(state.progress)}%</Text>
        </View>
      );
    }

    if (state.panoramaResult) {
      return (
        <View style={styles.bottomPanel}>
          <Text style={styles.bottomPrimary}>✅ Panorama Created!</Text>
          <Text style={styles.bottomSecondary}>ID: {state.panoramaResult.panoramaId}</Text>
          <TouchableOpacity style={styles.primaryAction} onPress={() => Alert.alert('View', state.panoramaResult.viewUrl || 'Panorama created successfully')}>
            <MaterialCommunityIcons name="eye" size={22} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>View Panorama</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction} onPress={resetCapture}>
            <Text style={styles.secondaryActionText}>Start over</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (allCaptured) {
      return (
        <View style={styles.bottomPanel}>
          <Text style={styles.bottomPrimary}>Ready to create panorama</Text>
          <Text style={styles.bottomSecondary}>Review the scene, then continue to stitching.</Text>

          <TouchableOpacity style={styles.primaryAction} onPress={handleCreatePanorama}>
            <MaterialCommunityIcons name="panorama" size={22} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Create panorama</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryAction} onPress={resetCapture}>
            <Text style={styles.secondaryActionText}>Start over</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.bottomPanel}>
        <Text style={styles.bottomPrimary}>
          Positionnez-vous et capturez depuis chaque point
        </Text>

        <View style={styles.progressTrack}>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${captureProgress}%` }]} />
            </View>
          </View>
          <Text style={styles.progressCounter}>{currentStep} sur {CAPTURE_POINTS}</Text>
          {state.error && <Text style={styles.bottomError}>{state.error}</Text>}
        </View>
      </View>
    );
  };

  const renderCaptureButton = () => {
    if (state.uploading || allCaptured) {
      return null;
    }

    return (
      <View style={styles.captureButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.captureRing,
            { opacity: isReadyToCapture ? 1 : 0.4 },
          ]}
          onPress={capturePhoto}
          disabled={!isReadyToCapture || state.capturing}
          accessibilityLabel="Capture photo"
        >
          {state.capturing ? (
            <ActivityIndicator color="#FF3B30" size="small" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />
      {renderTopControls()}
      {renderCenterOverlay()}
      {renderBottomPanel()}
      {renderCaptureButton()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    position: 'absolute',
    top: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  topButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  topButtonClose: {
    backgroundColor: '#FF3B30',
  },
  topStatus: {
    alignItems: 'center',
  },
  topStatusPrimary: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  topStatusSecondary: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  guidanceHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  viewfinderBox: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  viewfinderFrame: {
    position: 'absolute',
    top: 24,
    bottom: 24,
    left: 24,
    right: 24,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
  },
  centerCircleIndicator: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  centerCircleActive: {
    borderColor: '#34C759',
    borderWidth: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  capturePointMarker: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  nextPointMarker: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextPointCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(52, 199, 89, 0.6)',
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  nextPointReady: {
    borderColor: '#34C759',
    borderWidth: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
  },
  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 26,
    paddingBottom: 28,
    paddingTop: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
  },
  bottomPrimary: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomSecondary: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomError: {
    color: '#FF8080',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  progressTrack: {
    width: '100%',
    marginTop: 16,
  },
  progressBarContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBar: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
  },
  progressCounter: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  captureButtonWrapper: {
    position: 'absolute',
    bottom: 122,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureRing: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
  },
  primaryAction: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
  },
  secondaryAction: {
    marginTop: 12,
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  secondaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionInfo: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
  },
  permissionButton: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Panorama360CaptureGuided;
