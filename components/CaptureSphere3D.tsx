/**
 * CaptureSphere3D - 3D Spherical Capture Visualization
 * 
 * Renders a real-time 3D sphere showing:
 * - Wireframe guide sphere
 * - Captured photo positions (green spheres)
 * - Current target position (pulsing indicator)
 * - Device orientation tracking via sensors
 */

import { GLView } from 'expo-gl';
import { Magnetometer } from 'expo-sensors';
import { Renderer, TextureLoader } from 'expo-three';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
    Color,
    DoubleSide,
    EdgesGeometry,
    Group,
    LineBasicMaterial,
    LineSegments,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    PlaneGeometry,
    Scene,
    SphereGeometry,
    Vector3
} from 'three';

const { width, height } = Dimensions.get('window');

// Constants
const SPHERE_RADIUS = 5;
const MARKER_RADIUS = 0.35;
const TARGET_RADIUS = 0.45;

interface CapturePoint {
    azimuth: number;
    elevation?: number;
    uri?: string;
}

interface CaptureSphere3DProps {
    capturedPoints: CapturePoint[];
    targetAzimuths: number[];
    currentAzimuth: number;
    nextTargetAzimuth: number | null;
    isReadyToCapture: boolean;
    size?: number;
}

/**
 * Convert azimuth/elevation to 3D position on sphere
 */
function azimuthToPosition(azimuth: number, elevation: number = 0, radius: number = SPHERE_RADIUS): Vector3 {
    const phi = (90 - elevation) * (Math.PI / 180);
    const theta = (azimuth - 90) * (Math.PI / 180);

    return new Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

export default function CaptureSphere3D({
    capturedPoints,
    targetAzimuths,
    currentAzimuth,
    nextTargetAzimuth,
    isReadyToCapture,
    size = Math.min(width * 0.85, 340),
}: CaptureSphere3DProps) {
    const [deviceAzimuth, setDeviceAzimuth] = useState(0);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const markersGroupRef = useRef<Group | null>(null);
    const targetMarkerRef = useRef<Mesh | null>(null);
    const rendererRef = useRef<Renderer | null>(null);
    const animationFrameRef = useRef<number>(0);
    const pulseRef = useRef(0);

    // Track device orientation
    useEffect(() => {
        Magnetometer.setUpdateInterval(100);
        const subscription = Magnetometer.addListener(({ x, y }) => {
            let azimuth = Math.atan2(y, x) * (180 / Math.PI);
            azimuth = (azimuth + 360) % 360;
            setDeviceAzimuth(azimuth);
        });

        return () => subscription.remove();
    }, []);

    // Update markers when captured points change
    useEffect(() => {
        if (!markersGroupRef.current || !sceneRef.current) return;

        // Clear existing markers
        while (markersGroupRef.current.children.length > 0) {
            const child = markersGroupRef.current.children[0];
            markersGroupRef.current.remove(child);
            // Dispose geometry and material to prevent memory leaks
            if (child instanceof Mesh) {
                child.geometry?.dispose();
                if (child.material instanceof MeshBasicMaterial) {
                    child.material.map?.dispose();
                    child.material.dispose();
                }
            }
        }

        // Add captured point markers with image textures
        capturedPoints.forEach(async (point) => {
            const position = azimuthToPosition(point.azimuth, point.elevation || 0);

            // Create a plane geometry for the image thumbnail
            const imageSize = 1.2; // Size of the image plane
            const geometry = new PlaneGeometry(imageSize, imageSize * 0.75); // 4:3 aspect ratio

            let material: MeshBasicMaterial;

            // Try to load the image texture if URI is available
            if (point.uri) {
                try {
                    const texture = await TextureLoader.loadAsync(point.uri);
                    material = new MeshBasicMaterial({
                        map: texture,
                        side: DoubleSide,
                        transparent: true,
                        opacity: 0.95,
                    });
                } catch (error) {
                    // Fallback to green color if texture fails
                    material = new MeshBasicMaterial({
                        color: new Color(0x34C759),
                        transparent: true,
                        opacity: 0.9,
                    });
                }
            } else {
                // No URI, use green placeholder
                material = new MeshBasicMaterial({
                    color: new Color(0x34C759),
                    transparent: true,
                    opacity: 0.9,
                });
            }

            const marker = new Mesh(geometry, material);
            marker.position.copy(position);

            // Make the plane face outward from center (billboard effect)
            marker.lookAt(0, 0, 0);
            marker.rotateY(Math.PI); // Flip to face outward

            // Add a green border/frame effect
            const borderGeometry = new PlaneGeometry(imageSize + 0.15, imageSize * 0.75 + 0.15);
            const borderMaterial = new MeshBasicMaterial({
                color: new Color(0x34C759),
                side: DoubleSide,
            });
            const border = new Mesh(borderGeometry, borderMaterial);
            border.position.copy(position);
            border.lookAt(0, 0, 0);
            border.rotateY(Math.PI);
            // Push border slightly behind the image
            const borderOffset = position.clone().normalize().multiplyScalar(-0.02);
            border.position.add(borderOffset);

            markersGroupRef.current?.add(border);
            markersGroupRef.current?.add(marker);
        });

        // Add uncaptured target points (dim wireframe circles)
        targetAzimuths.forEach((azimuth) => {
            const isCaptured = capturedPoints.some((p) => {
                const diff = Math.abs(p.azimuth - azimuth);
                return Math.min(diff, 360 - diff) <= 20;
            });

            if (!isCaptured) {
                const position = azimuthToPosition(azimuth);
                const geometry = new SphereGeometry(MARKER_RADIUS * 0.5, 12, 12);
                const material = new MeshBasicMaterial({
                    color: new Color(0xffffff),
                    transparent: true,
                    opacity: 0.25,
                    wireframe: true,
                });
                const marker = new Mesh(geometry, material);
                marker.position.copy(position);
                markersGroupRef.current?.add(marker);
            }
        });
    }, [capturedPoints, targetAzimuths]);

    // Update target marker
    useEffect(() => {
        if (!targetMarkerRef.current) return;

        if (nextTargetAzimuth !== null) {
            const position = azimuthToPosition(nextTargetAzimuth);
            targetMarkerRef.current.position.copy(position);
            targetMarkerRef.current.visible = true;

            // Update color based on ready state
            const material = targetMarkerRef.current.material as MeshBasicMaterial;
            material.color.set(isReadyToCapture ? 0x34C759 : 0xFFD60A);
        } else {
            targetMarkerRef.current.visible = false;
        }
    }, [nextTargetAzimuth, isReadyToCapture]);

    const onContextCreate = async (gl: any) => {
        // Create renderer
        const renderer = new Renderer({ gl });
        renderer.setSize(size, size);
        renderer.setClearColor(0x000000, 0);
        rendererRef.current = renderer;

        // Create scene
        const scene = new Scene();
        sceneRef.current = scene;

        // Create camera (positioned outside sphere, looking at center)
        const camera = new PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 3, 12);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera;

        // Create wireframe sphere (guide)
        const sphereGeometry = new SphereGeometry(SPHERE_RADIUS, 24, 16);
        const edges = new EdgesGeometry(sphereGeometry);
        const lineMaterial = new LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.15,
        });
        const wireframeSphere = new LineSegments(edges, lineMaterial);
        scene.add(wireframeSphere);

        // Create equator line (brighter)
        const equatorGeometry = new SphereGeometry(SPHERE_RADIUS * 1.001, 64, 1);
        const equatorEdges = new EdgesGeometry(equatorGeometry);
        const equatorMaterial = new LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.4,
        });
        const equator = new LineSegments(equatorEdges, equatorMaterial);
        scene.add(equator);

        // Create markers group
        const markersGroup = new Group();
        scene.add(markersGroup);
        markersGroupRef.current = markersGroup;

        // Create target marker (pulsing)
        const targetGeometry = new SphereGeometry(TARGET_RADIUS, 20, 20);
        const targetMaterial = new MeshBasicMaterial({
            color: new Color(0xFFD60A),
            transparent: true,
            opacity: 0.8,
        });
        const targetMarker = new Mesh(targetGeometry, targetMaterial);
        targetMarker.visible = false;
        scene.add(targetMarker);
        targetMarkerRef.current = targetMarker;

        // Create current position indicator (small white sphere)
        const currentPosGeometry = new SphereGeometry(0.2, 12, 12);
        const currentPosMaterial = new MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
        });
        const currentPosMarker = new Mesh(currentPosGeometry, currentPosMaterial);
        scene.add(currentPosMarker);

        // Animation loop
        const render = () => {
            animationFrameRef.current = requestAnimationFrame(render);
            pulseRef.current += 0.08;

            // Rotate sphere based on device azimuth
            wireframeSphere.rotation.y = -deviceAzimuth * (Math.PI / 180);
            equator.rotation.y = -deviceAzimuth * (Math.PI / 180);
            markersGroup.rotation.y = -deviceAzimuth * (Math.PI / 180);

            // Update current position indicator
            const currentPos = azimuthToPosition(currentAzimuth);
            currentPosMarker.position.copy(currentPos);
            currentPosMarker.position.applyAxisAngle(new Vector3(0, 1, 0), -deviceAzimuth * (Math.PI / 180));

            // Pulse the target marker
            if (targetMarkerRef.current?.visible) {
                const scale = 1 + Math.sin(pulseRef.current) * 0.2;
                targetMarkerRef.current.scale.set(scale, scale, scale);
                targetMarkerRef.current.rotation.y = -deviceAzimuth * (Math.PI / 180);

                const material = targetMarkerRef.current.material as MeshBasicMaterial;
                material.opacity = 0.6 + Math.sin(pulseRef.current) * 0.3;
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();
        };

        render();
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <GLView
                style={styles.glView}
                onContextCreate={onContextCreate}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    glView: {
        flex: 1,
    },
});
