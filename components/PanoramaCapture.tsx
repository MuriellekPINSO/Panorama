/**
 * PanoramaCapture — "Paint the Sphere" 360° Capture
 *
 * Instead of chasing fixed dots, the user "paints" the sphere naturally:
 * 1. First photo is taken where you point (tap shutter)
 * 2. Guide rings appear at the EDGES of what's already captured
 * 3. Move toward a ring → auto-capture → sphere grows
 * 4. Coverage % fills up as you paint
 * 5. Done when coverage ≥ target or user taps Finish
 *
 * Each new photo ALWAYS overlaps the previous ones → guaranteed good stitching.
 * No fixed grid, no dot-chasing. Just move naturally.
 *
 * DeviceMotion (sensor fusion) for orientation. Pure 2D React Native overlay.
 */

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { DeviceMotion } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Camera FOV in portrait (typical smartphone)
const H_FOV = 60;
const V_FOV = 80;

// Each photo "stamps" this many degrees on the sphere.
// Slightly less than FOV → guarantees overlap between neighbours.
const PHOTO_H_SPAN = H_FOV * 0.65; // ~39°
const PHOTO_V_SPAN = V_FOV * 0.65; // ~52°

// Coverage grid resolution (degrees per cell)
const CELL_SIZE = 5;
const GRID_COLS = Math.ceil(360 / CELL_SIZE); // 72
const GRID_ROWS = Math.ceil(180 / CELL_SIZE); // 36
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

// Target coverage to auto-finish
const TARGET_COVERAGE = 0.85;

// Phone must be mostly still to auto-capture
const STABILITY_THRESHOLD = 0.35;

// Minimum ms between two captures
const CAPTURE_COOLDOWN_MS = 700;

// Min photos before "Finish" button appears
const MIN_PHOTOS_FINISH = 6;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shortest signed angle delta in degrees, result in [-180, 180] */
function angleDelta(from: number, to: number): number {
  return (((to - from) % 360) + 540) % 360 - 180;
}

/** Convert (yaw 0-360, pitch -90..+90) to grid cell */
function toCell(yaw: number, pitch: number): { col: number; row: number } {
  const col = Math.floor((((yaw % 360) + 360) % 360) / CELL_SIZE) % GRID_COLS;
  const row = Math.floor((90 - pitch) / CELL_SIZE);
  return {
    col: Math.max(0, Math.min(GRID_COLS - 1, col)),
    row: Math.max(0, Math.min(GRID_ROWS - 1, row)),
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CapturedPhoto {
  id: number;
  uri: string;
  yaw: number;
  pitch: number;
  roll: number;
  timestamp: number;
}

interface FrontierGuide {
  yaw: number;
  pitch: number;
  direction: 'left' | 'right' | 'up' | 'down';
}

type Phase = 'ready' | 'capturing' | 'processing' | 'done';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanoramaCapture() {
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('ready');
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [isSnapping, setIsSnapping] = useState(false);
  const [resultUri, setResultUri] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  // Coverage grid
  const coverageGrid = useRef<boolean[]>(new Array(TOTAL_CELLS).fill(false));
  const [coverage, setCoverage] = useState(0);

  // Orientation (raw sensor, no smoothing)
  const yawRef = useRef(0);
  const pitchRef = useRef(0);
  const rollRef = useRef(0);
  const rateRef = useRef({ a: 0, b: 0 });
  const startRef = useRef<{ alpha: number; beta: number } | null>(null);
  const lastCaptureTs = useRef(0);
  const photoIdRef = useRef(0);

  const cameraRef = useRef<CameraView>(null);

  // UI tick (~20fps)
  const [tick, setTick] = useState(0);
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ------------------------------------------------------------------
  // Mark cells covered by a photo at (yaw, pitch)
  // ------------------------------------------------------------------
  const markCoverage = useCallback((yaw: number, pitch: number) => {
    const halfH = PHOTO_H_SPAN / 2;
    const halfV = PHOTO_V_SPAN / 2;

    for (let dy = -halfV; dy <= halfV; dy += CELL_SIZE) {
      for (let dx = -halfH; dx <= halfH; dx += CELL_SIZE) {
        const pPitch = pitch + dy;
        if (pPitch < -90 || pPitch > 90) continue;
        const { col, row } = toCell(yaw + dx, pPitch);
        coverageGrid.current[row * GRID_COLS + col] = true;
      }
    }

    let count = 0;
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (coverageGrid.current[i]) count++;
    }
    setCoverage(count / TOTAL_CELLS);
  }, []);

  // ------------------------------------------------------------------
  // Compute frontier guides at the edges of already-captured area
  // ------------------------------------------------------------------
  const computeFrontierGuides = useCallback((): FrontierGuide[] => {
    if (photos.length === 0) return [];

    const guides: FrontierGuide[] = [];
    const lastP = photos[photos.length - 1];

    // 8 directions from the last capture
    const probes: { dx: number; dy: number; dir: FrontierGuide['direction'] }[] = [
      { dx: PHOTO_H_SPAN * 0.75, dy: 0, dir: 'right' },
      { dx: -PHOTO_H_SPAN * 0.75, dy: 0, dir: 'left' },
      { dx: 0, dy: PHOTO_V_SPAN * 0.75, dir: 'up' },
      { dx: 0, dy: -PHOTO_V_SPAN * 0.75, dir: 'down' },
      { dx: PHOTO_H_SPAN * 0.6, dy: PHOTO_V_SPAN * 0.6, dir: 'right' },
      { dx: -PHOTO_H_SPAN * 0.6, dy: PHOTO_V_SPAN * 0.6, dir: 'left' },
      { dx: PHOTO_H_SPAN * 0.6, dy: -PHOTO_V_SPAN * 0.6, dir: 'right' },
      { dx: -PHOTO_H_SPAN * 0.6, dy: -PHOTO_V_SPAN * 0.6, dir: 'left' },
    ];

    for (const { dx, dy, dir } of probes) {
      const gYaw = (((lastP.yaw + dx) % 360) + 360) % 360;
      const gPitch = Math.max(-90, Math.min(90, lastP.pitch + dy));
      const { col, row } = toCell(gYaw, gPitch);
      if (!coverageGrid.current[row * GRID_COLS + col]) {
        guides.push({ yaw: gYaw, pitch: gPitch, direction: dir });
      }
    }

    // Also scan for big uncovered zones globally
    const checkYaws = [0, 45, 90, 135, 180, 225, 270, 315];
    const checkPitches = [-60, -30, 0, 30, 60];
    for (const cYaw of checkYaws) {
      for (const cPitch of checkPitches) {
        const { col, row } = toCell(cYaw, cPitch);
        if (!coverageGrid.current[row * GRID_COLS + col]) {
          const tooClose = guides.some(
            (g) =>
              Math.abs(angleDelta(g.yaw, cYaw)) < 30 &&
              Math.abs(g.pitch - cPitch) < 30,
          );
          if (!tooClose) {
            const dYaw = angleDelta(yawRef.current, cYaw);
            guides.push({
              yaw: cYaw,
              pitch: cPitch,
              direction: dYaw > 0 ? 'right' : 'left',
            });
          }
        }
      }
    }

    return guides;
  }, [photos]);

  // ------------------------------------------------------------------
  // DeviceMotion listener
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'capturing' && phase !== 'ready') return;

    DeviceMotion.setUpdateInterval(phase === 'capturing' ? 16 : 100);

    const sub = DeviceMotion.addListener((data) => {
      if (!data.rotation) return;
      const { alpha, beta, gamma } = data.rotation;

      if (!startRef.current) {
        startRef.current = { alpha, beta };
      }

      let yaw = -(alpha - startRef.current.alpha) * (180 / Math.PI);
      yaw = ((yaw % 360) + 360) % 360;
      const pitch = (Math.PI / 2 - beta) * (180 / Math.PI);
      const roll = gamma * (180 / Math.PI);

      yawRef.current = yaw;
      pitchRef.current = pitch;
      rollRef.current = roll;

      if (data.rotationRate) {
        rateRef.current = {
          a: Math.abs(data.rotationRate.alpha),
          b: Math.abs(data.rotationRate.beta),
        };
      }
    });

    if (phase === 'capturing') {
      tickInterval.current = setInterval(() => setTick((t) => t + 1), 50);
    }

    return () => {
      sub.remove();
      if (tickInterval.current) {
        clearInterval(tickInterval.current);
        tickInterval.current = null;
      }
    };
  }, [phase]);

  // ------------------------------------------------------------------
  // Auto-capture: fires when user reaches a frontier zone
  // ------------------------------------------------------------------
  useEffect(() => {
    if (phase !== 'capturing' || isSnapping) return;
    if (photos.length === 0) return; // first photo is manual

    const now = Date.now();
    if (now - lastCaptureTs.current < CAPTURE_COOLDOWN_MS) return;

    // Stability check
    const isStable =
      rateRef.current.a < STABILITY_THRESHOLD &&
      rateRef.current.b < STABILITY_THRESHOLD;
    if (!isStable) return;

    // Sample points across the current FOV
    const yaw = yawRef.current;
    const pitch = pitchRef.current;
    const samples = [
      [0, 0],
      [H_FOV * 0.3, 0],
      [-H_FOV * 0.3, 0],
      [0, V_FOV * 0.3],
      [0, -V_FOV * 0.3],
    ];

    let uncovered = 0;
    let covered = 0;

    for (const [dx, dy] of samples) {
      const sPitch = Math.max(-90, Math.min(90, pitch + dy));
      const { col, row } = toCell(yaw + dx, sPitch);
      if (coverageGrid.current[row * GRID_COLS + col]) {
        covered++;
      } else {
        uncovered++;
      }
    }

    // Frontier = we see both covered AND uncovered area (guarantees overlap)
    if (covered >= 1 && uncovered >= 2) {
      captureFrame();
    }
  }, [tick, phase, isSnapping, photos.length]);

  // ------------------------------------------------------------------
  // Capture a frame
  // ------------------------------------------------------------------
  const captureFrame = useCallback(async () => {
    if (!cameraRef.current || isSnapping) return;
    setIsSnapping(true);
    lastCaptureTs.current = Date.now();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('No photo');

      const id = photoIdRef.current++;
      const captured: CapturedPhoto = {
        id,
        uri: photo.uri,
        yaw: yawRef.current,
        pitch: pitchRef.current,
        roll: rollRef.current,
        timestamp: Date.now(),
      };

      setPhotos((prev) => [...prev, captured]);
      markCoverage(captured.yaw, captured.pitch);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn('Capture failed:', e);
    } finally {
      setIsSnapping(false);
    }
  }, [markCoverage, isSnapping]);

  // Auto-finish when coverage target reached
  useEffect(() => {
    if (phase === 'capturing' && coverage >= TARGET_COVERAGE && photos.length >= MIN_PHOTOS_FINISH) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setPhase('processing'), 800);
    }
  }, [coverage, phase, photos.length]);

  // ------------------------------------------------------------------
  // Upload & stitch
  // ------------------------------------------------------------------
  const handleStitch = async () => {
    try {
      const formData = new FormData();

      for (let i = 0; i < photos.length; i++) {
        const p = photos[i];
        const fileData = await FileSystem.readAsStringAsync(p.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const blob = await (async () => {
          const res = await fetch(`data:image/jpeg;base64,${fileData}`);
          return res.blob();
        })();
        formData.append(
          'photos',
          blob,
          `photo_${i}_y${Math.round(p.yaw)}_p${Math.round(p.pitch)}.jpg`,
        );
      }

      const orientationData = photos.map((p) => ({
        id: p.id,
        yaw: p.yaw,
        pitch: p.pitch,
        roll: p.roll,
        timestamp: p.timestamp,
      }));
      formData.append(
        'metadata',
        JSON.stringify({
          captureType: 'paint-sphere-360',
          photoCount: photos.length,
          coverage: Math.round(coverage * 100),
          orientations: orientationData,
          timestamp: new Date().toISOString(),
        }),
      );

      const API_URL = 'http://192.168.100.22:3000'; // TODO: make configurable
      const resp = await fetch(`${API_URL}/api/stitch-panorama`, {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      const result = await resp.json();
      if (!result.success) throw new Error(result.error || 'Stitching failed');

      const localDir = `${FileSystem.documentDirectory}panoramas/`;
      const dirInfo = await FileSystem.getInfoAsync(localDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(localDir, { intermediates: true });
      }
      const localPath = `${localDir}pano_${Date.now()}.jpg`;
      await FileSystem.downloadAsync(result.panoramaUrl, localPath);

      setResultUri(localPath);
      setPhase('done');
      Alert.alert('✅ 360° Ready!', 'Your VR-compatible panorama has been created.');
    } catch (e: any) {
      console.error('Stitch error:', e);
      Alert.alert('Error', e.message || 'Failed to create panorama');
      setPhase('capturing');
    }
  };

  useEffect(() => {
    if (phase === 'processing' && photos.length >= MIN_PHOTOS_FINISH) {
      handleStitch();
    }
  }, [phase]);

  // ------------------------------------------------------------------
  // Start / Reset
  // ------------------------------------------------------------------
  const startCapture = () => {
    setPhotos([]);
    startRef.current = null;
    coverageGrid.current = new Array(TOTAL_CELLS).fill(false);
    setCoverage(0);
    lastCaptureTs.current = 0;
    photoIdRef.current = 0;
    setResultUri(null);
    setPhase('capturing');
  };

  const handleRecalibrate = () => {
    startRef.current = null;
    yawRef.current = 0;
    pitchRef.current = 0;
    rollRef.current = 0;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const resetAll = () => {
    setPhase('ready');
    setPhotos([]);
    startRef.current = null;
    coverageGrid.current = new Array(TOTAL_CELLS).fill(false);
    setCoverage(0);
    setResultUri(null);
  };

  // ------------------------------------------------------------------
  // Projection helper
  // ------------------------------------------------------------------
  const projectToScreen = useCallback(
    (wYaw: number, wPitch: number) => {
      const dYaw = angleDelta(yawRef.current, wYaw);
      const dPitch = wPitch - pitchRef.current;
      const x = SCREEN_W / 2 + (dYaw / H_FOV) * SCREEN_W;
      const y = SCREEN_H / 2 - (dPitch / V_FOV) * SCREEN_H;
      const margin = 80;
      const visible =
        x > -margin && x < SCREEN_W + margin && y > -margin && y < SCREEN_H + margin;
      return { x, y, visible };
    },
    [tick],
  );

  // Visible frontier guides
  const getVisibleGuides = useCallback(() => {
    if (phase !== 'capturing' || photos.length === 0) return [];
    const frontier = computeFrontierGuides();
    return frontier
      .map((g) => {
        const { x, y, visible } = projectToScreen(g.yaw, g.pitch);
        return { ...g, screenX: x, screenY: y, visible };
      })
      .filter((g) => g.visible);
  }, [phase, tick, photos, computeFrontierGuides, projectToScreen]);

  // Direction hint for off-screen frontier
  const getDirectionHint = useCallback(() => {
    if (photos.length === 0) return null;
    const frontier = computeFrontierGuides();
    if (frontier.length === 0) return null;

    let closest = frontier[0];
    let closestDist = Infinity;
    for (const g of frontier) {
      const dY = angleDelta(yawRef.current, g.yaw);
      const dP = g.pitch - pitchRef.current;
      const dist = Math.sqrt(dY * dY + dP * dP);
      if (dist < closestDist) {
        closestDist = dist;
        closest = g;
      }
    }

    return {
      dYaw: angleDelta(yawRef.current, closest.yaw),
      dPitch: closest.pitch - pitchRef.current,
      distance: closestDist,
    };
  }, [tick, photos, computeFrontierGuides]);

  // ------------------------------------------------------------------
  // Coverage map overlay
  // ------------------------------------------------------------------
  const renderCoverageMap = () => {
    const MAP_W = SCREEN_W - 40;
    const MAP_H = MAP_W / 2;
    const viewX = ((yawRef.current % 360) / 360) * MAP_W;
    const viewY = ((90 - pitchRef.current) / 180) * MAP_H;

    const SAMPLE = 3;
    const dots: { x: number; y: number; covered: boolean }[] = [];
    for (let r = 0; r < GRID_ROWS; r += SAMPLE) {
      for (let c = 0; c < GRID_COLS; c += SAMPLE) {
        dots.push({
          x: (c / GRID_COLS) * MAP_W,
          y: (r / GRID_ROWS) * MAP_H,
          covered: coverageGrid.current[r * GRID_COLS + c],
        });
      }
    }

    return (
      <View style={styles.mapOverlay}>
        <TouchableOpacity
          style={styles.mapBackdrop}
          activeOpacity={1}
          onPress={() => setShowMap(false)}
        />
        <View style={styles.mapContainer}>
          <Text style={styles.mapTitle}>Coverage Map</Text>
          <Text style={styles.mapSubtitle}>
            {Math.round(coverage * 100)}% covered • {photos.length} photos
          </Text>

          <View style={[styles.mapBox, { width: MAP_W, height: MAP_H }]}>
            {dots.map((d, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: d.x,
                  top: d.y,
                  width: (MAP_W / GRID_COLS) * SAMPLE,
                  height: (MAP_H / GRID_ROWS) * SAMPLE,
                  backgroundColor: d.covered
                    ? 'rgba(52,199,89,0.45)'
                    : 'rgba(255,255,255,0.04)',
                }}
              />
            ))}

            {photos.map((p) => {
              const px = ((p.yaw % 360) / 360) * MAP_W;
              const py = ((90 - p.pitch) / 180) * MAP_H;
              return (
                <View
                  key={p.id}
                  style={{
                    position: 'absolute',
                    left: px - 3,
                    top: py - 3,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#FFF',
                    borderWidth: 1,
                    borderColor: '#34C759',
                  }}
                />
              );
            })}

            <View
              style={{
                position: 'absolute',
                left: viewX - 8,
                top: viewY - 8,
                width: 16,
                height: 16,
                borderRadius: 8,
                borderWidth: 2.5,
                borderColor: '#1D8CF8',
                backgroundColor: 'rgba(29,140,248,0.3)',
              }}
            />

            <Text style={[styles.mapLabel, { top: 2, left: MAP_W / 2 - 10 }]}>Front</Text>
            <Text style={[styles.mapLabel, { top: 2, left: 4 }]}>Left</Text>
            <Text style={[styles.mapLabel, { top: 2, right: 4 }]}>Right</Text>
          </View>

          <TouchableOpacity style={styles.mapCloseBtn} onPress={() => setShowMap(false)}>
            <Text style={styles.mapCloseBtnText}>Back to Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================================================================
  // RENDER
  // ==================================================================

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#666" />
        <Text style={styles.permText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Ready ---
  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.center}>
        <MaterialCommunityIcons name="panorama-sphere-outline" size={80} color="#1D8CF8" />
        <Text style={styles.readyTitle}>360° Panorama</Text>

        <View style={styles.instructionBox}>
          {[
            ['1', 'Tap the shutter to take your first photo'],
            ['2', 'Follow the guide rings at the edges'],
            ['3', 'Photos are taken automatically as you move'],
            ['4', 'Paint the sphere until the bar is full!'],
          ].map(([num, text]) => (
            <View key={num} style={styles.instructionStep}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepNum}>{num}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.readyHint}>
          Move naturally — each photo overlaps the last.{'\n'}
          VR/AR-compatible equirectangular output.
        </Text>

        <TouchableOpacity style={styles.startBtn} onPress={startCapture}>
          <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
          <Text style={styles.startBtnText}>Start Capture</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Done ---
  if (phase === 'done' && resultUri) {
    return (
      <SafeAreaView style={styles.center}>
        <Image source={{ uri: resultUri }} style={styles.resultPreview} resizeMode="contain" />
        <Text style={styles.doneTitle}>360° Panorama Ready</Text>
        <Text style={styles.doneSubtitle}>
          {photos.length} photos • {Math.round(coverage * 100)}% coverage
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={resetAll}>
          <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          <Text style={styles.startBtnText}>Capture Another</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- Processing ---
  if (phase === 'processing') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1D8CF8" />
        <Text style={styles.readyTitle}>Stitching 360° Panorama…</Text>
        <Text style={styles.readySubtitle}>
          Uploading {photos.length} photos and creating{'\n'}
          equirectangular projection for VR
        </Text>
      </SafeAreaView>
    );
  }

  // --- CAPTURE SCREEN ---
  const guides = getVisibleGuides();
  const hint = getDirectionHint();
  const coveragePct = Math.round(coverage * 100);
  const isFirstPhoto = photos.length === 0;

  return (
    <View style={styles.captureContainer}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {showMap && renderCoverageMap()}

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.progressPill}>
          <Text style={styles.progressText}>{coveragePct}%</Text>
        </View>
        <View style={styles.photoPill}>
          <MaterialCommunityIcons name="camera" size={14} color="#FFF" />
          <Text style={styles.photoCountText}>{photos.length}</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setShowMap(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <MaterialCommunityIcons name="earth" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRecalibrate}>
            <MaterialCommunityIcons name="target" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={resetAll}>
            <MaterialCommunityIcons name="close" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Coverage progress bar */}
      <View style={styles.progressBarOuter}>
        <View
          style={[
            styles.progressBarInner,
            {
              width: `${coveragePct}%`,
              backgroundColor:
                coveragePct >= 85 ? '#34C759' : coveragePct >= 50 ? '#FFD60A' : '#1D8CF8',
            },
          ]}
        />
      </View>

      {/* Center crosshair */}
      <View style={styles.crosshair} pointerEvents="none">
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={[styles.crosshairDot, isFirstPhoto && styles.crosshairFirst]} />
      </View>

      {/* First photo prompt */}
      {isFirstPhoto && (
        <View style={styles.firstPhotoHint} pointerEvents="none">
          <Text style={styles.firstPhotoText}>
            Point at anything and tap the shutter ↓
          </Text>
        </View>
      )}

      {/* Frontier guide rings */}
      {guides.map((g, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[styles.guideRing, { left: g.screenX - 28, top: g.screenY - 28 }]}
        >
          <MaterialCommunityIcons
            name={
              g.direction === 'right'
                ? 'chevron-right'
                : g.direction === 'left'
                ? 'chevron-left'
                : g.direction === 'up'
                ? 'chevron-up'
                : 'chevron-down'
            }
            size={24}
            color="#FFD60A"
          />
        </View>
      ))}

      {/* Direction arrow when frontier is off-screen */}
      {!isFirstPhoto && hint && hint.distance > H_FOV * 0.5 && (
        <View style={styles.directionHint}>
          <MaterialCommunityIcons
            name={
              Math.abs(hint.dYaw) > Math.abs(hint.dPitch)
                ? hint.dYaw > 0
                  ? 'arrow-right'
                  : 'arrow-left'
                : hint.dPitch > 0
                ? 'arrow-up'
                : 'arrow-down'
            }
            size={36}
            color="#FFD60A"
          />
          <Text style={styles.directionText}>
            {Math.abs(hint.dYaw) > Math.abs(hint.dPitch)
              ? hint.dYaw > 0
                ? 'Turn right'
                : 'Turn left'
              : hint.dPitch > 0
              ? 'Tilt up'
              : 'Tilt down'}
          </Text>
        </View>
      )}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.captureBtn, isSnapping && { opacity: 0.4 }]}
          onPress={captureFrame}
          disabled={isSnapping}
        >
          {isSnapping ? (
            <ActivityIndicator color="#FF3B30" size="small" />
          ) : (
            <View style={styles.captureBtnInner} />
          )}
        </TouchableOpacity>

        {photos.length >= MIN_PHOTOS_FINISH && (
          <TouchableOpacity style={styles.finishBtn} onPress={() => setPhase('processing')}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#FFF" />
            <Text style={styles.finishBtnText}>Finish ({coveragePct}%)</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSnapping && <View style={styles.flashOverlay} />}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 32,
  },

  // Permission
  permText: { color: '#888', fontSize: 16, marginTop: 16 },
  permBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1D8CF8',
  },
  permBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },

  // Ready
  readyTitle: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  readySubtitle: {
    color: '#AAA',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  readyHint: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 20,
  },
  instructionBox: {
    marginTop: 28,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1D8CF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  stepText: { color: '#CCC', fontSize: 14, flex: 1, lineHeight: 20 },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D8CF8',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 32,
    gap: 10,
  },
  startBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  // Done
  resultPreview: {
    width: SCREEN_W - 48,
    height: (SCREEN_W - 48) / 2,
    borderRadius: 12,
    backgroundColor: '#222',
  },
  doneTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', marginTop: 20 },
  doneSubtitle: { color: '#888', fontSize: 14, marginTop: 8, textAlign: 'center' },

  // Capture
  captureContainer: { flex: 1, backgroundColor: '#000' },

  topBar: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  progressPill: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  progressText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  photoPill: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  photoCountText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  topActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  progressBarOuter: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 50,
    overflow: 'hidden',
  },
  progressBarInner: { height: '100%', borderRadius: 2 },

  crosshair: {
    position: 'absolute',
    top: SCREEN_H / 2 - 24,
    left: SCREEN_W / 2 - 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 40,
  },
  crosshairH: {
    position: 'absolute',
    width: 32,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  crosshairV: {
    position: 'absolute',
    width: 1.5,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  crosshairDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  crosshairFirst: {
    backgroundColor: '#FFD60A',
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  firstPhotoHint: {
    position: 'absolute',
    top: SCREEN_H / 2 + 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  firstPhotoText: {
    color: '#FFD60A',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textAlign: 'center',
  },

  guideRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,214,10,0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,214,10,0.08)',
  },

  directionHint: {
    position: 'absolute',
    top: SCREEN_H / 2 + 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  directionText: {
    color: '#FFD60A',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FF3B30',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52,199,89,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  finishBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
    zIndex: 100,
  },

  // Coverage map
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  mapContainer: { alignItems: 'center', paddingHorizontal: 20 },
  mapTitle: { color: '#FFF', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  mapSubtitle: { color: '#999', fontSize: 13, marginBottom: 20 },
  mapBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  mapLabel: {
    position: 'absolute',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '600',
  },
  mapCloseBtn: {
    marginTop: 24,
    backgroundColor: '#1D8CF8',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  mapCloseBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
