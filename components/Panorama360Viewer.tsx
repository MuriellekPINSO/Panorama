import { GLView } from 'expo-gl';
import { Gyroscope } from 'expo-sensors';
import { Renderer, TextureLoader } from 'expo-three';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import {
    BackSide,
    Mesh,
    MeshBasicMaterial,
    PerspectiveCamera,
    Scene,
    SphereGeometry
} from 'three';

const { width, height } = Dimensions.get('window');

interface Panorama360ViewerProps {
  imageUri: string;
  useGyroscope?: boolean;
}

export default function Panorama360Viewer({ 
  imageUri, 
  useGyroscope = true 
}: Panorama360ViewerProps) {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const gyroRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });

  // Gestionnaire de toucher pour rotation manuelle
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        lastTouchRef.current = {
          x: evt.nativeEvent.pageX,
          y: evt.nativeEvent.pageY
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!useGyroscope) {
          const deltaX = gestureState.dx * 0.005;
          const deltaY = gestureState.dy * 0.005;
          
          setRotation(prev => ({
            x: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, prev.x + deltaY)),
            y: prev.y + deltaX
          }));
        }
      }
    })
  ).current;

  // Gyroscope pour rotation automatique
  useEffect(() => {
    if (!useGyroscope) return;

    Gyroscope.setUpdateInterval(16);
    
    const subscription = Gyroscope.addListener(({ x, y, z }) => {
      gyroRef.current.y += z * 0.05; // Rotation horizontale
      gyroRef.current.x += x * 0.05; // Rotation verticale
      
      // Limiter la rotation verticale
      gyroRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, gyroRef.current.x));
      
      setRotation({ ...gyroRef.current });
    });

    return () => subscription.remove();
  }, [useGyroscope]);

  const onContextCreate = async (gl: any) => {
    // Créer le renderer
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);

    // Créer la scène
    const scene = new Scene();

    // Créer la caméra
    const camera = new PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);

    // Créer la sphère pour le panorama
    const geometry = new SphereGeometry(500, 60, 40);
    
    // Charger la texture de l'image
    const texture = await TextureLoader.loadAsync(imageUri);
    
    const material = new MeshBasicMaterial({
      map: texture,
      side: BackSide, // Afficher l'intérieur de la sphère
    });

    const sphere = new Mesh(geometry, material);
    sphere.rotation.y = Math.PI; // Corriger l'orientation
    scene.add(sphere);

    // Fonction de rendu
    const render = () => {
      requestAnimationFrame(render);
      
      // Appliquer la rotation
      camera.rotation.x = rotation.x;
      camera.rotation.y = rotation.y;
      
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    render();
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
});
